# AI-test

Instructions for candidates completing this exercise.

## Tech stack

This project is based on the official Laravel Livewire starter kit:

| Layer | Technology |
|-------|------------|
| Language | PHP 8.3+ |
| Framework | Laravel 13 |
| Frontend | Livewire 4, Flux UI, Blade |
| Auth | Laravel Fortify (with passkeys / 2FA) |
| CSS | Tailwind CSS 4 |
| Bundler | Vite 8 |
| Database | MySQL (configurable) |
| Tests | PHPUnit 12 |

## Setup

### 1. Fork the repository

You do not have write access to the main repository, so you need to work from your own fork.

1. Open [https://github.com/PropaySystems/ai-test](https://github.com/PropaySystems/ai-test)
2. Click **Fork** in the top-right corner
3. Choose your GitHub account as the destination

### 2. Clone your fork

Clone the repository from **your fork**, not the main repo:

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/ai-test.git
cd ai-test
```

Replace `YOUR-GITHUB-USERNAME` with your actual GitHub username.

Optionally, add the main repository as `upstream` so you can pull future updates:

```bash
git remote add upstream https://github.com/PropaySystems/ai-test.git
```

Confirm your remotes look correct:

```bash
git remote -v
```

You should see `origin` pointing to your fork and, if added, `upstream` pointing to `PropaySystems/ai-test`.

### 3. Create a feature branch

Create a new feature branch named after yourself:

```bash
git checkout -b feature/your-name
```

Replace `your-name` with your actual name (e.g. `feature/jane-doe`).

### 4. Follow the instructions you receive

Listen to and follow the instructions provided to you during the exercise.

### 5. Install the test rule in your LLM or IDE

Copy the rule file from the **test rules** section of this repo:

```
test-rules/commit-user-prompts.mdc
```

Move a copy into whatever LLM or IDE you use, so it is **always applied** on every interaction. Where you put it depends on your tool:

| Tool | Typical location |
|------|------------------|
| **Cursor** | `.cursor/rules/commit-user-prompts.mdc` |
| **Other IDEs / agents** | Use that tool’s equivalent “always-on” rules or instructions folder |

The rule tells the AI to log every user prompt to `prompts/prompts.md` and commit the log automatically.

### 6. Test that the rule is working

After the rule is in place, send any prompt to your LLM or instruction AI (for example: “Say hello”).

**Expected result:** the AI creates a `prompts/` folder containing a `prompts.md` file with your prompt logged inside, and commits the change to git.

If that folder and file appear after your test prompt, the rule is installed correctly.

### 7. Push your branch to your fork

When you have completed all instructions, push your feature branch to **your fork**:

```bash
git push -u origin feature/your-name
```

### 8. Open a pull request into `master`

Create a pull request from your forked branch into the main repository.

**Option A — GitHub website (recommended)**

1. Go to your fork on GitHub: `https://github.com/YOUR-GITHUB-USERNAME/ai-test`
2. GitHub will usually show a banner: **Compare & pull request**. Click it.
   - If you do not see the banner, open the **Pull requests** tab and click **New pull request**
3. Set:
   - **base repository:** `PropaySystems/ai-test`
   - **base branch:** `master`
   - **head repository:** `YOUR-GITHUB-USERNAME/ai-test`
   - **compare branch:** `feature/your-name`
4. Add a title and description, then click **Create pull request**

**Option B — GitHub CLI**

If you use the `gh` CLI, run this from your local repo:

```bash
gh pr create \
  --repo PropaySystems/ai-test \
  --base master \
  --head YOUR-GITHUB-USERNAME:feature/your-name \
  --title "Complete candidate exercise" \
  --body "Completed all setup and exercise instructions."
```

Replace `YOUR-GITHUB-USERNAME` and `feature/your-name` with your actual values.
