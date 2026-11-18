# CV Builder on Vercel

Folder contents
- index.html  the app
- api/ai.js   serverless function that powers AI (Fill from text + Ask AI to edit)
- vercel.json, package.json

Deploy
1. Put this whole folder in a GitHub repo (or use `vercel` CLI in this folder).
2. On vercel.com: Add New > Project > import it. Framework preset: Other. No build command.
3. Before deploying: Settings > Environment Variables > add
   ANTHROPIC_API_KEY = your key from console.anthropic.com
   (optional) ANTHROPIC_MODEL = claude-sonnet-4-6
4. Deploy. If you added the key after deploying, press Redeploy.

Test AI: open the site > AI > Fill from text, paste a few lines, tap Fill.
If it fails, open Vercel > Logs, or the red message in the app says what is wrong
(missing key, invalid key, too many requests).

Your saved CVs and Library live in each visitor's own browser storage.
