# Routinely — Task Manager

A clean, interactive daily task manager built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies, no build tools — just open `index.html` and start using it.

🔗 **[Live Demo](https://YOUR_USERNAME.github.io/routinely-task-manager)**  
*(Replace with your GitHub Pages URL after deployment)*

---

## ✨ Features

| Feature | Description |
|---|---|
| **Task Management** | Add, edit, delete tasks with title, due date, category and notes |
| **4-Level Priority** | Urgent 🚨 / High 🔴 / Medium ⚡ / Low 🟢 — click badge to cycle |
| **5 Categories** | Work, Personal, Health, Learning, Other — colour coded |
| **Recurring Tasks** | Daily, Weekdays, Weekly, Monthly — auto-spawns next occurrence |
| **🔥 Daily Streak** | Tracks consecutive days with completed tasks |
| **📊 Productivity Score** | Live 0–100 score based on completion, streak & priority |
| **14-Day Heatmap** | Visual activity calendar showing daily output |
| **Priority Breakdown** | Bar chart of active tasks by priority — clickable to filter |
| **Filters & Search** | Filter by All / Active / Done / High Priority / Overdue + live search |
| **Persistent Storage** | All data saved to localStorage — survives page refresh |

---

## 📁 Project Structure

```
routinely-task-manager/
├── index.html   → Page structure and HTML markup
├── style.css    → All styles, organised into 20 labelled sections
├── app.js       → All logic, organised into 21 labelled sections
└── README.md    → This file
```

**Why three files?**
- `index.html` — only HTML. Easy to see the page structure at a glance.
- `style.css` — only CSS. Has a table of contents at the top so you can jump to any section.
- `app.js` — only JavaScript. Every function has a JSDoc comment explaining what it does.

---

## 🚀 Getting Started

### Option 1 — Open directly (no server needed)
```bash
git clone https://github.com/YOUR_USERNAME/routinely-task-manager.git
cd routinely-task-manager
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Option 2 — Use a local server (recommended)
```bash
# Python 3
python -m http.server 3000

# Node.js (npx)
npx serve .
```
Then visit `http://localhost:3000`

---

## 🌐 Deploying to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch** → `main` → `/ (root)`
4. Your app will be live at `https://YOUR_USERNAME.github.io/routinely-task-manager`

---

## 🛠️ Customisation

All design tokens (colours, spacing, fonts) are CSS variables in `style.css`:

```css
:root {
  --bg:      #0d0f14;   /* Page background */
  --accent:  #f0b429;   /* Gold — primary accent */
  --accent2: #6c8aff;   /* Blue — secondary accent */
  --green:   #56d9a0;   /* Green — completion colour */
  --danger:  #ff5757;   /* Red — overdue / urgent */
}
```

Change these values to instantly re-theme the entire app.

---

## 📦 Tech Stack

- **HTML5** — semantic markup, no templates
- **CSS3** — custom properties, grid, flexbox, animations
- **Vanilla JavaScript (ES6+)** — no jQuery, no frameworks
- **localStorage** — client-side persistence

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🙌 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request
