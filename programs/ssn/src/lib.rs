use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("SSNprogXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

// ─────────────────────────────────────────────────────────────────────────────
// SSN — Solana Science Network
// Smart Contract (Anchor / Rust)
//
// Instructions:
//   1. initialize_platform  – one-time setup of the global state PDA
//   2. publish_paper        – submit a new research paper
//   3. add_review           – peer-review a paper (1-5 stars + IPFS comment)
//   4. contribute           – send SOL to a paper's escrow
//   5. release_funds        – paper author withdraws escrowed SOL
// ─────────────────────────────────────────────────────────────────────────────

#[program]
pub mod ssn {
    use super::*;

    // ── 1. initialize_platform ───────────────────────────────────────────────
    /// Called once to create the global PlatformState PDA.
    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        let state = &mut ctx.accounts.platform_state;
        state.authority = ctx.accounts.authority.key();
        state.total_papers = 0;
        state.total_reviews = 0;
        state.bump = ctx.bumps.platform_state;
        emit!(PlatformInitialized {
            authority: state.authority,
        });
        Ok(())
    }

    // ── 2. publish_paper ─────────────────────────────────────────────────────
    /// Registers a new paper on-chain.
    /// The PDF must be pinned to IPFS beforehand; its CID is stored here.
    pub fn publish_paper(
        ctx: Context<PublishPaper>,
        title: String,
        authors: Vec<String>,
        abstract_cid: String, // IPFS CID of abstract / metadata JSON
        pdf_cid: String,      // IPFS CID of the actual PDF
        field: String,        // e.g. "Biology", "Physics"
        funding_goal: u64,    // lamports; 0 = no funding goal
    ) -> Result<()> {
        require!(title.len() <= 200, SsnError::TitleTooLong);
        require!(authors.len() >= 1 && authors.len() <= 20, SsnError::InvalidAuthors);
        require!(abstract_cid.len() <= 100, SsnError::CidTooLong);
        require!(pdf_cid.len() <= 100, SsnError::CidTooLong);
        require!(field.len() <= 50, SsnError::FieldTooLong);

        let paper = &mut ctx.accounts.paper;
        let state = &mut ctx.accounts.platform_state;
        let author_profile = &mut ctx.accounts.author_profile;
        let clock = Clock::get()?;

        paper.id = state.total_papers;
        paper.author = ctx.accounts.author.key();
        paper.title = title.clone();
        paper.authors = authors;
        paper.abstract_cid = abstract_cid;
        paper.pdf_cid = pdf_cid;
        paper.field = field;
        paper.published_at = clock.unix_timestamp;
        paper.review_count = 0;
        paper.avg_rating = 0;
        paper.funding_goal = funding_goal;
        paper.funding_raised = 0;
        paper.bump = ctx.bumps.paper;

        // Update platform counter
        state.total_papers = state.total_papers.checked_add(1).unwrap();

        // Award reputation for publishing
        author_profile.reputation = author_profile
            .reputation
            .checked_add(REPUTATION_PUBLISH)
            .unwrap_or(u64::MAX);
        author_profile.papers_published = author_profile
            .papers_published
            .checked_add(1)
            .unwrap_or(u64::MAX);

        emit!(PaperPublished {
            paper_id: paper.id,
            author: paper.author,
            title: title,
            pdf_cid: paper.pdf_cid.clone(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ── 3. add_review ────────────────────────────────────────────────────────
    /// Submit a peer review for a paper.
    /// One wallet can only review a paper once (enforced via PDA seeds).
    pub fn add_review(
        ctx: Context<AddReview>,
        rating: u8,        // 1-5
        comment_cid: String, // IPFS CID of the review text
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, SsnError::InvalidRating);
        require!(comment_cid.len() <= 100, SsnError::CidTooLong);

        let review = &mut ctx.accounts.review;
        let paper = &mut ctx.accounts.paper;
        let reviewer_profile = &mut ctx.accounts.reviewer_profile;
        let clock = Clock::get()?;

        // Reviewer cannot review their own paper
        require!(
            ctx.accounts.reviewer.key() != paper.author,
            SsnError::CannotReviewOwnPaper
        );

        review.paper_id = paper.id;
        review.reviewer = ctx.accounts.reviewer.key();
        review.rating = rating;
        review.comment_cid = comment_cid;
        review.submitted_at = clock.unix_timestamp;
        review.bump = ctx.bumps.review;

        // Recalculate running average rating
        let prev_total = (paper.avg_rating as u64)
            .checked_mul(paper.review_count as u64)
            .unwrap_or(0);
        paper.review_count = paper.review_count.checked_add(1).unwrap_or(u32::MAX);
        let new_avg = prev_total
            .checked_add(rating as u64)
            .unwrap_or(0)
            .checked_div(paper.review_count as u64)
            .unwrap_or(0);
        paper.avg_rating = new_avg as u8;

        // Award reputation for reviewing
        reviewer_profile.reputation = reviewer_profile
            .reputation
            .checked_add(REPUTATION_REVIEW)
            .unwrap_or(u64::MAX);
        reviewer_profile.reviews_submitted = reviewer_profile
            .reviews_submitted
            .checked_add(1)
            .unwrap_or(u64::MAX);

        // Update platform counter
        ctx.accounts.platform_state.total_reviews = ctx
            .accounts
            .platform_state
            .total_reviews
            .checked_add(1)
            .unwrap_or(u64::MAX);

        emit!(ReviewAdded {
            paper_id: paper.id,
            reviewer: review.reviewer,
            rating,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ── 4. contribute ────────────────────────────────────────────────────────
    /// Contribute SOL to a paper's escrow PDA.
    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        require!(amount > 0, SsnError::ZeroContribution);

        let paper = &mut ctx.accounts.paper;

        // Transfer lamports from contributor to escrow PDA
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.contributor.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount)?;

        paper.funding_raised = paper.funding_raised.checked_add(amount).unwrap_or(u64::MAX);

        let clock = Clock::get()?;
        emit!(FundingContributed {
            paper_id: paper.id,
            contributor: ctx.accounts.contributor.key(),
            amount,
            total_raised: paper.funding_raised,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    // ── 5. release_funds ─────────────────────────────────────────────────────
    /// Paper author withdraws all escrowed SOL.
    /// Only the original author can call this.
    pub fn release_funds(ctx: Context<ReleaseFunds>) -> Result<()> {
        let paper = &ctx.accounts.paper;
        let escrow = &ctx.accounts.escrow;
        let author = &ctx.accounts.author;

        require!(paper.author == author.key(), SsnError::Unauthorized);

        let escrow_balance = escrow.lamports();
        require!(escrow_balance > 0, SsnError::NoFundsToRelease);

        // Transfer all lamports from escrow PDA to author
        // We use the PDA's seeds to sign
        let paper_id_bytes = paper.id.to_le_bytes();
        let seeds: &[&[u8]] = &[
            b"escrow",
            paper_id_bytes.as_ref(),
            &[ctx.bumps.escrow],
        ];
        let signer = &[seeds];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: escrow.to_account_info(),
                to: author.to_account_info(),
            },
            signer,
        );
        system_program::transfer(cpi_ctx, escrow_balance)?;

        emit!(FundsReleased {
            paper_id: paper.id,
            author: author.key(),
            amount: escrow_balance,
        });

        Ok(())
    }

    // ── 6. initialize_profile ────────────────────────────────────────────────
    /// Create a reputation profile for a wallet (called once per user).
    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.wallet = ctx.accounts.wallet.key();
        profile.reputation = 0;
        profile.papers_published = 0;
        profile.reviews_submitted = 0;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const REPUTATION_PUBLISH: u64 = 50;
const REPUTATION_REVIEW: u64 = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Accounts structs
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PlatformState::INIT_SPACE,
        seeds = [b"platform"],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishPaper<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + Paper::INIT_SPACE,
        seeds = [b"paper", platform_state.total_papers.to_le_bytes().as_ref()],
        bump
    )]
    pub paper: Account<'info, Paper>,

    #[account(
        init_if_needed,
        payer = author,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", author.key().as_ref()],
        bump
    )]
    pub author_profile: Account<'info, UserProfile>,

    #[account(mut, seeds = [b"platform"], bump = platform_state.bump)]
    pub platform_state: Account<'info, PlatformState>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(rating: u8, comment_cid: String)]
pub struct AddReview<'info> {
    #[account(
        init,
        payer = reviewer,
        space = 8 + Review::INIT_SPACE,
        // One review per (reviewer, paper_id) — enforced by PDA seeds
        seeds = [b"review", paper.key().as_ref(), reviewer.key().as_ref()],
        bump
    )]
    pub review: Account<'info, Review>,

    #[account(
        init_if_needed,
        payer = reviewer,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", reviewer.key().as_ref()],
        bump
    )]
    pub reviewer_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub paper: Account<'info, Paper>,

    #[account(mut, seeds = [b"platform"], bump = platform_state.bump)]
    pub platform_state: Account<'info, PlatformState>,

    #[account(mut)]
    pub reviewer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub paper: Account<'info, Paper>,

    /// CHECK: escrow PDA — receives lamports
    #[account(
        mut,
        seeds = [b"escrow", paper.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: UncheckedAccount<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    #[account(mut, has_one = author)]
    pub paper: Account<'info, Paper>,

    /// CHECK: escrow PDA — sends lamports
    #[account(
        mut,
        seeds = [b"escrow", paper.id.to_le_bytes().as_ref()],
        bump
    )]
    pub escrow: UncheckedAccount<'info>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = wallet,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"profile", wallet.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─────────────────────────────────────────────────────────────────────────────
// State Accounts (on-chain data)
// ─────────────────────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct PlatformState {
    pub authority: Pubkey,    // 32
    pub total_papers: u64,    // 8
    pub total_reviews: u64,   // 8
    pub bump: u8,             // 1
}

#[account]
#[derive(InitSpace)]
pub struct Paper {
    pub id: u64,                        // 8
    pub author: Pubkey,                 // 32
    #[max_len(200)]
    pub title: String,                  // 4 + 200
    #[max_len(20, 50)]
    pub authors: Vec<String>,           // 4 + 20*(4+50)
    #[max_len(100)]
    pub abstract_cid: String,           // 4 + 100
    #[max_len(100)]
    pub pdf_cid: String,                // 4 + 100
    #[max_len(50)]
    pub field: String,                  // 4 + 50
    pub published_at: i64,              // 8
    pub review_count: u32,              // 4
    pub avg_rating: u8,                 // 1
    pub funding_goal: u64,              // 8
    pub funding_raised: u64,            // 8
    pub bump: u8,                       // 1
}

#[account]
#[derive(InitSpace)]
pub struct Review {
    pub paper_id: u64,          // 8
    pub reviewer: Pubkey,       // 32
    pub rating: u8,             // 1
    #[max_len(100)]
    pub comment_cid: String,    // 4 + 100
    pub submitted_at: i64,      // 8
    pub bump: u8,               // 1
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub wallet: Pubkey,             // 32
    pub reputation: u64,            // 8
    pub papers_published: u64,      // 8
    pub reviews_submitted: u64,     // 8
    pub bump: u8,                   // 1
}

// ─────────────────────────────────────────────────────────────────────────────
// Events (emitted for off-chain indexing)
// ─────────────────────────────────────────────────────────────────────────────

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
}

#[event]
pub struct PaperPublished {
    pub paper_id: u64,
    pub author: Pubkey,
    pub title: String,
    pub pdf_cid: String,
    pub timestamp: i64,
}

#[event]
pub struct ReviewAdded {
    pub paper_id: u64,
    pub reviewer: Pubkey,
    pub rating: u8,
    pub timestamp: i64,
}

#[event]
pub struct FundingContributed {
    pub paper_id: u64,
    pub contributor: Pubkey,
    pub amount: u64,
    pub total_raised: u64,
    pub timestamp: i64,
}

#[event]
pub struct FundsReleased {
    pub paper_id: u64,
    pub author: Pubkey,
    pub amount: u64,
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

#[error_code]
pub enum SsnError {
    #[msg("Title exceeds 200 characters")]
    TitleTooLong,
    #[msg("Authors list must have 1-20 entries")]
    InvalidAuthors,
    #[msg("IPFS CID exceeds 100 characters")]
    CidTooLong,
    #[msg("Field exceeds 50 characters")]
    FieldTooLong,
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("You cannot review your own paper")]
    CannotReviewOwnPaper,
    #[msg("Contribution amount must be greater than 0")]
    ZeroContribution,
    #[msg("No funds available to release")]
    NoFundsToRelease,
    #[msg("Only the paper author can release funds")]
    Unauthorized,
}
