# 🎨 Wplace-Script

<div align="center">

Automate actions on [wplace.live](https://wplace.live) and boost your experience!

[![CI](https://github.com/Eduardo854832/Wplace-Script/workflows/CI/badge.svg)](https://github.com/Eduardo854832/Wplace-Script/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CodeQL](https://github.com/Eduardo854832/Wplace-Script/workflows/CodeQL/badge.svg)](https://github.com/Eduardo854832/Wplace-Script/actions/workflows/codeql.yml)

[Português](./README.md) • [Tutorial](./TUTORIAL.en.md) • [Contributing](./CONTRIBUTING.md)

</div>

> ⚠️ **Warning:** The script may not work as expected in every situation.

---

## 📋 Table of Contents

- [✨ What is it?](#-what-is-it)
- [🚀 Quick Start](#-quick-start)  
- [📖 How to Use](#-how-to-use)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ What is it?

Wplace-Script is a collection of scripts/bookmarklets to automate repetitive tasks on wplace.live, such as automatically painting pixels. It brings a friendly interface directly in the browser, without needing to install extensions.

### 🎯 Features

- **AUTO-FARM.js**: Smart painting automation with multiple algorithms
- **AUTO-IMAGE.js**: Image-based automatic painting
- Modern and responsive interface
- Multi-language support (PT/EN)
- Advanced configuration system

---

## 🚀 Quick Start

1. **Copy the desired script** (always from the official repository!)
2. **Add as bookmark** in your browser
3. **Go to [wplace.live](https://wplace.live)**
4. **Click the bookmark** to activate the bot!

> 📚 See the [detailed tutorial](./TUTORIAL.en.md) for complete instructions.

---

## 📖 How to Use

### 1. Copy the Official Bookmarklet

Always copy the script from this repository—never from third parties!

**Auto Farm (MAINTENANCE)**

```javascript
javascript: fetch(
  'https://raw.githubusercontent.com/Eduardo854832/Wplace-Script/refs/heads/main/AUTO-FARM.js'
)
  .then(t => t.text())
  .then(eval)
```

**Auto Image**

```javascript
javascript: fetch(
  'https://raw.githubusercontent.com/Eduardo854832/Wplace-Script/refs/heads/main/AUTO-IMAGE.js'
)
  .then(t => t.text())
  .then(eval)
```

---

### 2. Install in Your Browser (Google Chrome)

1. Open Chrome.
2. Click the three dots > Bookmarks > Bookmark Manager.
3. Add any page to your bookmarks.
4. Edit the newly created bookmark:
   - Name: `wplace` (or whatever you prefer)
   - URL: Delete everything and paste the script above.
5. Save.
6. Visit [wplace.live](https://wplace.live) and click the bookmark to activate the bot!

> See the detailed step-by-step guide in [TUTORIAL_en.md](./TUTORIAL.en.md)

---

## 🗺️ Roadmap

- [ ] **v0.2.0**: Interface improvements and new algorithms
- [ ] **v0.3.0**: Plugin system and extensibility  
- [ ] **v0.4.0**: Support for more platforms
- [ ] **v1.0.0**: Complete stable version

> See [CHANGELOG.md](./CHANGELOG.md) for version details.

---

## 🤝 Contributing

Contributions are always welcome! See the [contribution guide](./CONTRIBUTING.md) to learn how to help.

### 🐛 Found a bug?
Open an [issue](https://github.com/Eduardo854832/Wplace-Script/issues/new/choose) using the appropriate template.

### 💡 Have an idea?
Share a [feature request](https://github.com/Eduardo854832/Wplace-Script/issues/new/choose)!

---

## 📄 License

This project is under the MIT license. See [LICENSE](./LICENSE) for details.

---

<div align="center"><sub>Made with 💜 by Eduardo854832</sub></div>
