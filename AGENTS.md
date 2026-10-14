# Design & Coding Guidelines: No Emojis

## Rule: Never Use Emojis in the Application
- **NEVER** use emojis (such as 📄, 📋, 📜, 💰, 🔒, 🏢, 🌾, 🌻, 🫒, 🏭, 🕒, ⚠️, ☆, ★, 📞, etc.) anywhere in the application (UI labels, headings, modal headers, status indicators, buttons, or logs).
- **ALWAYS** use clean, professional inline SVG icons from `Icons` (defined in `public/static/components/ui.js`), or render clean typography labels.
- When adding new icons, add them as standard Feather/Lucide-style SVG strings to `Icons` in `public/static/components/ui.js`.

## Codebase Architecture & File Inventory
- For a comprehensive architectural outline, breakdown of every folder, and file-by-file explanations, see [CODEBASE.md](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/CODEBASE.md).
- For an ultra-detailed breakdown of business logic, legacy procedures, data porting audits, and pending optimizations, see [BUSINESS_LOGIC.md](file:///Users/vedantsmacmini/Desktop/Soft%20Sauda/Debug/soft-sauda-web/BUSINESS_LOGIC.md).
