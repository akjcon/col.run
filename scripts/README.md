# Training Plan Scripts

This directory contains utility scripts for managing training plans in Firebase.

## Prerequisites

Before running these scripts, ensure you have the following environment variables set in your `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-service-account-private-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Important Note About Plan IDs

Training plans in Firebase have two different IDs:

- **Document ID**: The Firebase-generated document identifier
- **Plan ID**: The `id` field inside the plan document (e.g., "default-plan")

All scripts use the **Plan ID** field value, not the Document ID. Use `npm run list-plans` to see both IDs for all plans.

## Available Scripts

### 1. List Training Plans

Shows all training plans for a user with both Document IDs and Plan IDs.

```bash
npm run list-plans <userId>
```

- `userId`: Required. The Firebase user ID

Example:

```bash
npm run list-plans user123
```

This will display:

- Document ID (Firebase-generated)
- Plan ID (the `id` field value to use with other scripts)
- Plan type, weeks, dates, and status

### 2. Analyze Training Plan

Displays detailed information about a user's training plan, including validation checks.

```bash
npm run analyze-plan <userId> [planId]
```

- `userId`: Required. The Firebase user ID
- `planId`: Optional. The plan's `id` field value (not the document ID). Defaults to "default-plan"

Example:

```bash
npm run analyze-plan user123
npm run analyze-plan user123 custom-plan-id
```

This will show:

- Plan overview (type, weeks, dates)
- Training zones
- Training phases
- Week-by-week breakdown
- Data validation checks
- Workout statistics

### 3. Backup Training Plan

Creates a local JSON backup of a training plan.

```bash
npm run backup-plan <userId> [planId]
```

- `userId`: Required. The Firebase user ID
- `planId`: Optional. The plan's `id` field value (not the document ID). Defaults to "default-plan"

Example:

```bash
npm run backup-plan user123
npm run backup-plan user123 custom-plan-id
```

Backups are saved to:

- `backups/training-plan-{userId}-{planId}-{timestamp}.json`
- `backups/training-plan-{userId}-{planId}-latest.json` (most recent)

### 4. Extend Training Plan

Extends an incomplete training plan by generating the remaining weeks using AI.

```bash
npm run extend-plan <userId> [planId]
```

- `userId`: Required. The Firebase user ID
- `planId`: Optional. The plan's `id` field value (not the document ID). Defaults to "default-plan"

Example:

```bash
npm run extend-plan user123
npm run extend-plan user123 custom-plan-id
```

This script will:

1. Fetch the current plan from Firebase
2. Check if it's complete
3. Get the user's training background
4. Call the Anthropic API with the book content and existing plan
5. Generate the remaining weeks
6. Validate the generated weeks
7. Update the plan in Firebase

### Important Notes

- **Always run `analyze-plan` first** to verify the current state before extending
- **Run `backup-plan` before extending** to create a safety backup
- The extend script will maintain consistency with existing weeks
- The final week will always be a proper race week with taper
- Generated weeks follow the phase distribution defined in the original plan
- All timestamps are stored in epoch format (milliseconds)

### 5. Parse Partial Weeks (Recovery Tool)

Saves partially generated weeks from a failed extend-plan run.

```bash
npm run parse-partial <userId> [planId] <json-file>
```

- `userId`: Required. The Firebase user ID
- `planId`: Optional. The plan's `id` field value. Defaults to "default-plan"
- `json-file`: Required. Path to file containing the JSON array of weeks

Example:

```bash
# 1. Copy the JSON array from failed output (starting with [ and ending with ])
# 2. Save to a file (e.g., partial-weeks.json)
# 3. Run:
npm run parse-partial user123 default-plan partial-weeks.json
```

This is useful when the LLM generates weeks successfully but the script fails during parsing or saving.

### Troubleshooting

If you encounter errors:

1. **Firebase Authentication**: Ensure your service account credentials are correct
2. **Plan Not Found**: Verify the userId and planId are correct
3. **API Errors**: Check your Anthropic API key and quota
4. **JSON Parse Errors**: The LLM included extra text - the updated script handles this automatically
5. **Truncated Response**: The script will retry automatically to get missing weeks

### Safety Features

- The script validates all generated weeks before saving
- Week numbers must be sequential
- Each week must have exactly 7 days
- The script won't overwrite existing weeks
- A backup timestamp is added when extending (`lastExtendedAt`)

### Recommended Workflow

1. **List all plans** to find the correct plan ID:

   ```bash
   npm run list-plans YOUR_USER_ID
   ```

2. **Analyze the plan** you want to extend:

   ```bash
   npm run analyze-plan YOUR_USER_ID default-plan
   ```

3. **Create a backup** before making changes:

   ```bash
   npm run backup-plan YOUR_USER_ID default-plan
   ```

4. **Extend the plan** to add missing weeks:

   ```bash
   npm run extend-plan YOUR_USER_ID default-plan
   ```

5. **Verify the results**:
   ```bash
   npm run analyze-plan YOUR_USER_ID default-plan
   ```
