# MindLog

Current engineering details: [Architecture](ARCHITECTURE.md) · [Journal format](JOURNAL_FORMAT.md). Run `npm run typecheck` and `npm test` before an Android build. Full vault archive export and in-app restore are still planned; copy the entire selected vault folder for a complete backup today.

### Your thoughts. Your files. Your privacy.

**MindLog** is a privacy-first, offline-first micro-journaling application for Android, designed for people who want to capture the small moments, thoughts, ideas, observations, emotions, and events of everyday life without turning their personal journal into someone else's cloud data.

Unlike conventional note-taking applications, MindLog is built around a simple principle:

> **A personal journal should belong to the person who wrote it — not the platform that hosts it.**

MindLog treats your journal as **your own collection of Markdown files**, rather than as content locked inside a proprietary database or SaaS platform.

No MindLog account.
No MindLog backend.
No advertising.
No analytics.
No tracking.
No social feed.
No engagement algorithms.

Just a private space for writing.

---

## Why MindLog?

We live in a world where almost everything can become a social post, a cloud document, an analytics event, or another piece of data stored on somebody else's infrastructure.

Even personal thoughts are increasingly being written inside platforms that were never specifically designed around absolute ownership of personal data.

A common example is using a **private social-media account as a personal journal**.

It makes sense at first:

* Open the app
* Write a short thought
* Add a timestamp
* Scroll through previous posts
* Everything appears in a familiar timeline

In other words, a private social-media account can function surprisingly well as a micro-journal.

But there is a fundamental difference:

**Private does not necessarily mean locally owned.**

Your account may be private from other users, while your data can still reside on the platform's infrastructure and remain subject to that platform's technology, policies, account systems, backups, and future changes.

MindLog was created around a different idea:

> **Why use a social network to talk to yourself when you can simply write to yourself?**

---

# What is Micro-Journaling?

Traditional journaling can feel like a task.

A blank page creates pressure:

> "What should I write?"

Micro-journaling removes that pressure.

A micro-journal entry can be:

```text
Finally fixed that annoying bug.
```

or:

```text
The sunset looked incredible today.
```

or:

```text
Need to research Spring Boot authentication tomorrow.
```

or:

```text
Had an unexpectedly good conversation with an old friend.
```

It can be one sentence, a few lines, or a longer reflection.

There is no required format.

There is no minimum word count.

There is no requirement to write every day.

**If something is worth remembering, write it down.**

Over time, these tiny entries become a searchable personal timeline — a record of your life as it actually happened.

---

# The Core Philosophy

MindLog is built around five principles.

### 1. Privacy by Architecture

Privacy should not depend entirely on a company's promise.

The architecture itself should minimize the amount of data that ever leaves your device.

### 2. Ownership

Your journal should exist as files that you can access independently of the application.

Your data should not become useless simply because an application disappears.

### 3. Simplicity

The application should make writing easier, not turn journaling into another productivity system.

### 4. Durability

Human-readable Markdown is intentionally used as the journal format.

Your memories should remain readable years from now.

### 5. User Control

The user decides where the journal lives, how it is backed up, and what happens to it.

---

# What Makes MindLog Different?

MindLog is **not trying to be another Notion, Evernote, OneNote, or Google Keep.**

Those applications are excellent at managing information.

MindLog is designed around something different:

**capturing life.**

| Traditional Notes App                  | MindLog                                |
| -------------------------------------- | -------------------------------------- |
| Designed for information management    | Designed for personal reflection       |
| Documents and notebooks                | Timeline of moments                    |
| Rich editors and formatting            | Fast, lightweight capture              |
| Usually application-centric storage    | File-centric storage                   |
| Often cloud-connected                  | Offline-first                          |
| Platform database is commonly central  | Markdown files are the source of truth |
| Productivity-oriented                  | Reflection-oriented                    |
| Collaboration/sharing may be important | Personal/private by design             |
| Feature-heavy                          | Intentionally focused                  |
| Account/cloud ecosystems are common    | No MindLog account required            |

MindLog sits somewhere between a diary, a timeline, and a personal text archive.

---

# The "Private Twitter" Problem

One of the inspirations behind MindLog is a behavior many people already practice:

### Using a private social-media account as a journal.

The concept is understandable.

A private timeline provides:

* quick posting
* timestamps
* chronological history
* short-form writing
* easy mobile access
* an effortless writing interface

In many ways, it is already a good micro-journal interface.

The problem is **where the journal lives**.

With a private social-media account, the journal remains part of the platform's infrastructure.

MindLog takes the useful part of that experience — the **fast chronological stream of short thoughts** — while removing the social-network layer.

Instead of:

```text
You
   ↓
Social Network
   ↓
Platform Account
   ↓
Platform Database
   ↓
Your Journal
```

MindLog is designed around:

```text
You
   ↓
MindLog
   ↓
Your Files
   ↓
Your Storage
```

The application is a tool for accessing your journal.

**It does not need to become the owner of your journal.**

---

# Local-First by Design

MindLog follows a **local-first** philosophy.

Your journal is stored locally on your Android device using the Android Storage Access Framework.

The user selects the journal folder, and MindLog works with that folder rather than requiring a proprietary cloud backend.

The application does not require:

* a MindLog account
* a MindLog server
* a MindLog database
* a subscription
* advertising infrastructure
* analytics infrastructure

This makes the journal useful even without an internet connection.

---

# Your Journal Is a Collection of Files

One of the most important architectural decisions in MindLog is that **Markdown files are the source of truth**.

A typical journal structure looks like:

```text
MindLog/
│
├── Journal/
│   └── 2026/
│       └── 09/
│           ├── 16.md
│           ├── 17.md
│           └── 18.md
│
├── Attachments/
│
└── mindlog-settings.json
```

This has a major advantage:

Your journal isn't trapped inside MindLog.

You can inspect the files yourself.

You can back them up.

You can copy them.

You can synchronize them using your own storage tools.

You can open the Markdown files using another application.

You can continue using the files even if MindLog itself is no longer available.

---

# Human-Readable Data

MindLog deliberately avoids making your journal dependent on an opaque proprietary format.

A journal entry remains readable text.

For example:

```markdown
<!-- mindlog-entry -->
<!-- id: 20260918-001 -->
<!-- created: 2026-09-18T02:14:31 -->
<!-- updated: 2026-09-18T02:18:09 -->

Finally finished the feature I had been working on.
Need to start the next project tomorrow.
```

The exact internal format may evolve, but the fundamental principle remains:

**Your journal should remain understandable without MindLog.**

---

# Core Features

## Fast Capture

MindLog is designed around the shortest possible path between:

> "I want to remember this."

and

> "It's written down."

Open the application, write, save.

No complicated workspace setup.

No notebook hierarchy required.

No formatting ritual.

---

## Chronological Timeline

Entries appear in a timeline-oriented interface.

Instead of forcing you to organize your thoughts into folders before writing them, MindLog allows your journal to naturally develop as a chronological record.

This mirrors how memory works:

**What happened → When it happened → What you thought about it.**

---

## Multiple Entries Per Day

A day does not have to be a single journal entry.

You can record multiple moments throughout the day:

```text
09:30 — Finished breakfast.

14:10 — Had an interesting idea for a project.

18:45 — Went for a walk.

23:50 — Finished today's work.
```

This makes MindLog suitable for true micro-journaling rather than only traditional once-a-day diary writing.

---

## Edit and Delete

Thoughts change.

Sometimes you make a typo.

Sometimes you want to rewrite something.

Sometimes something simply doesn't deserve to remain in your journal.

MindLog provides straightforward editing and deletion while preserving the underlying file-based model.

---

## Offline Search

Your journal can be searched without requiring an internet connection or remote search service.

This is particularly important for a journal containing years of personal memories.

Instead of remembering:

> "I wrote something about that project sometime last year..."

you can search your own archive.

---

## Markdown

Markdown provides a lightweight and durable representation for your journal.

It is:

* human-readable
* plain text
* portable
* widely supported
* easy to back up
* easy to version
* independent of a proprietary editor

Your journal is therefore closer to a **personal digital archive** than a conventional application database.

---

## Light and Dark Themes

MindLog supports:

* Light mode
* Dark mode
* System theme

The interface is intentionally restrained so that the application remains focused on writing rather than visual complexity.

---

## Markdown Export

Entries can be shared/exported through Android's native sharing mechanism.

This allows journal content to move into other applications without requiring a proprietary export pipeline.

---

# Privacy Model

MindLog's privacy philosophy can be summarized as:

### Collect less.

### Store locally.

### Give the user the files.

The application does not need to know:

* who you are
* what you are writing
* what you are thinking
* what websites you visit
* how often you journal
* which entries you read
* what topics appear in your journal

There is no reason for a micro-journal to behave like an advertising platform.

---

# No MindLog Cloud

MindLog does not require a centralized MindLog cloud service.

This is an intentional architectural decision.

A conventional cloud application might look like:

```text
Phone
  ↓
Internet
  ↓
Application Server
  ↓
Database
```

MindLog's local-first model is closer to:

```text
Phone
  ↓
Journal Folder
  ↓
Markdown Files
```

This reduces the amount of infrastructure involved between the user and their own writing.

---

# No Account Required

There is no reason to create a MindLog account simply to write something down.

No:

* email registration
* password for a MindLog server
* profile
* username
* social identity
* follower system

The application is intended to be a tool, not a social network.

---

# No Social Features

MindLog deliberately avoids features such as:

* followers
* likes
* comments
* public profiles
* feeds
* trending topics
* engagement metrics
* social notifications

This is important because journaling changes when you know someone else might eventually read it.

MindLog is designed around the assumption that:

> **You don't need an audience.**

You can write something because it matters to you.

---

# No Engagement Optimization

Most social platforms are designed to maximize engagement.

MindLog has a different goal:

### Minimize friction between thought and capture.

The application does not need to keep you scrolling.

It does not need to convince you to stay longer.

It does not need to recommend content.

It does not need to manufacture notifications.

The ideal MindLog session might be:

```text
Open → Write → Save → Close
```

That is a feature, not a limitation.

---

# Data Ownership

MindLog's strongest distinction is its relationship with your data.

Instead of thinking:

> "My journal exists inside an app."

MindLog encourages:

> "My journal is my files, and this app helps me work with them."

This creates a different ownership model.

The application becomes replaceable.

The data does not.

---

# Designed for Long-Term Personal Archives

A journal can potentially contain decades of personal history.

That makes longevity important.

A five-year journal should not depend completely on whether a company:

* continues operating
* maintains its servers
* maintains an old application
* continues a subscription plan
* changes its export policy
* changes its business model

Plain Markdown files provide a simple foundation for long-term preservation.

Your future self should be able to open your old journal without needing permission from your past software provider.

---

# Storage Philosophy

MindLog follows a simple hierarchy:

```text
                    YOUR JOURNAL
                         │
                         ▼
                 Markdown Files
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        Local Device          User-Controlled
                              Backup / Sync
```

The application itself is not intended to become the permanent owner of the data.

---

# Future Storage & Sync

Cloud synchronization is intentionally not part of the initial 1.0 architecture.

The long-term vision is to support **user-controlled synchronization**, including services such as:

* Google Drive
* Microsoft OneDrive
* potentially other user-controlled storage providers

The important distinction is that synchronization should not mean:

> "Upload everything to MindLog's servers."

Instead:

> **Synchronize the user's journal directly with storage the user controls.**

This preserves the fundamental philosophy of the project.

Future synchronization also needs to handle conflicts carefully. A journal application should never silently overwrite one version of a user's memories with another.

Where conflicts occur, the system should preserve both versions or provide a transparent conflict-resolution mechanism.

---

# Privacy vs. Convenience

MindLog intentionally recognizes a trade-off:

The more centralized a service becomes, the easier certain conveniences can be.

A centralized service can provide:

* automatic multi-device synchronization
* account recovery
* server-side processing
* centralized search
* cloud backups

But centralization also creates another dependency.

MindLog chooses to begin from the opposite direction:

### Ownership first.

### Convenience second.

Future features should improve convenience without abandoning that principle.

---

# Security

MindLog's architecture reduces unnecessary data exposure, but local storage should not be confused with absolute security.

Your device itself remains an important security boundary.

For example, if someone gains unrestricted access to an unlocked device or to the journal folder, local files may be accessible.

Therefore, good device-level security remains important:

* Use Android device encryption.
* Use a strong device passcode.
* Keep Android updated.
* Protect backups.
* Be careful when granting applications access to your journal folder.

MindLog minimizes unnecessary external exposure; it does not claim to make a compromised device secure.

---

# Architecture

MindLog is built as an Android application using:

* **React Native**
* **Expo**
* **TypeScript**
* **Android Storage Access Framework**
* **Markdown-based file storage**

The application is structured around a file-first data model rather than treating a remote database as the primary source of truth.

Repository structure:

```text
micro-journaling-app/
│
├── models/
├── services/
├── utils/
│
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

The `services` layer handles application-level storage and journal operations, while models and utilities provide structure around journal data and supporting functionality.

---

# Why Markdown Instead of a Database?

A database is excellent when an application needs complex relationships, transactions, synchronization, and large-scale querying.

But a personal journal has a different requirement:

### It needs to remain yours.

Markdown provides several useful properties:

**Portable**

The files can be moved between devices.

**Readable**

A human can open them without specialized software.

**Editable**

They can be modified using ordinary text editors.

**Versionable**

They can be stored in Git or other version-control systems if desired.

**Back-up friendly**

Copying the journal directory creates a straightforward backup.

**Future-proof**

Plain text is one of the simplest digital formats to preserve.

MindLog therefore treats the file system as an important part of the product rather than hiding it behind an application-specific database.

---

# Example Use Cases

## 1. Daily Micro-Journal

Capture one or two sentences every day.

```text
September 18

Finally completed the project I've been procrastinating on.
```

---

## 2. Thought Capture

An idea appears while you're away from your computer.

Open MindLog.

Write it down.

Continue your day.

---

## 3. Life Logging

Record small events throughout the day:

```text
08:30 — Breakfast with family.
11:20 — Started working.
15:40 — New project idea.
18:00 — Went for a walk.
23:30 — Watched a movie.
```

Over time, these fragments become a searchable record of your life.

---

## 4. Learning Journal

Track what you learn:

```text
Today I finally understood why binary search works on a monotonic search space.
```

Months later, search for:

```text
binary search
```

and rediscover the thought.

---

## 5. Developer Journal

Record:

* bugs
* solutions
* architecture ideas
* project decisions
* lessons learned
* things to investigate later

Your journal becomes a personal engineering memory.

---

## 6. Private Reflection

Write thoughts that were never intended for anyone else.

No audience.

No likes.

No comments.

Just you.

---

# MindLog vs. Social Media

|                              | Social Media Journal         | MindLog                           |
| ---------------------------- | ---------------------------- | --------------------------------- |
| Short-form writing           | Yes                          | Yes                               |
| Timeline                     | Yes                          | Yes                               |
| Mobile-first                 | Yes                          | Yes                               |
| Private by default           | Depends on platform/settings | Core design principle             |
| Data stored by platform      | Typically yes                | Journal files are user-controlled |
| Social features              | Yes                          | No                                |
| Advertising ecosystem        | Common                       | Not required                      |
| Engagement algorithms        | Common                       | No                                |
| Account required             | Usually                      | No MindLog account                |
| Offline-first                | Usually limited              | Yes                               |
| Human-readable files         | Usually no                   | Yes                               |
| Markdown-based archive       | No                           | Yes                               |
| Platform-independent journal | Limited                      | Core goal                         |

The fundamental difference is not the interface.

It is the **ownership model**.

---

# MindLog vs. Traditional Notes Apps

Traditional notes applications are often designed to answer:

> "How can I organize information?"

MindLog asks:

> "How can I quickly preserve a moment of my life?"

That difference affects the entire product.

MindLog intentionally avoids becoming a general-purpose knowledge-management platform.

You don't need:

* complex workspaces
* elaborate folder systems
* databases
* collaborative editing
* project management
* document templates
* productivity dashboards

You just need somewhere to put the thought.

---

# Design Principles

MindLog follows these principles when new features are considered.

### Privacy over growth

A feature that requires unnecessary data collection should be questioned.

### Ownership over lock-in

The user's files should remain useful outside the application.

### Simplicity over feature count

A larger feature list does not automatically make a better journal.

### User control over automation

Automation should assist the user without taking control of their data.

### Reflection over engagement

The product should help people write, not keep them inside the application.

### Durability over dependency

A journal should outlive the software used to create it.

---

# Roadmap

MindLog is designed as a foundation for a larger privacy-first personal journaling system.

Potential future features include:

### Storage

* [ ] Google Drive synchronization
* [ ] Microsoft OneDrive synchronization
* [ ] User-selectable sync folders
* [ ] Conflict detection
* [ ] Conflict resolution
* [ ] Backup and restore workflows

### Journaling

* [ ] Richer Markdown support
* [ ] Tags
* [ ] Categories
* [ ] Attachments
* [ ] Photos
* [ ] Voice notes
* [ ] Mood markers
* [ ] Daily summaries
* [ ] Calendar-based navigation

### Search & Discovery

* [ ] Full-text indexing
* [ ] Advanced filters
* [ ] Search by date
* [ ] Search by tag
* [ ] Search by mood
* [ ] Timeline navigation
* [ ] "On this day" memories

### Privacy

* [ ] Optional application lock
* [ ] Biometric authentication
* [ ] Encrypted local journal option
* [ ] Secure attachment handling
* [ ] Privacy/security audit

### Personal Intelligence

Future intelligent features should follow the same privacy philosophy.

For example:

```text
Journal
   ↓
Local processing
   ↓
Patterns / insights
   ↓
User
```

rather than:

```text
Journal
   ↓
Remote server
   ↓
AI service
   ↓
Database
```

Any future AI functionality should be carefully designed so that personal writing does not need to leave the user's control merely to provide useful insights.

---

# Installation

## Requirements

* Node.js 20+
* Android Studio
* Android SDK
* Android device or emulator

## Clone the repository

```bash
git clone https://github.com/Joshinx17/micro-journaling-app.git

cd micro-journaling-app
```

## Install dependencies

```bash
npm install
```

## Build for Android

```bash
npx expo prebuild --platform android
npx expo run:android
```

Expo Go is not used for the full application because persistent Android folder access requires a development build.

---

# Release APK

To generate a local release APK:

```bash
npx expo prebuild --platform android

cd android

gradlew.bat assembleRelease
```

The resulting APK can be found at:

```text
android/app/build/outputs/apk/release/
```

Before distributing a production build, configure an appropriate Android signing key.

---

# Data Backup

Because the journal consists of files, backing up your journal can be straightforward.

For example:

```text
MindLog/
```

can be copied to:

```text
External Drive
    └── MindLog/
```

or another user-controlled storage location.

Future versions can make this process more seamless through direct synchronization with services such as Google Drive and OneDrive.

---

# Open Source

MindLog is designed to be transparent about how a personal journal application handles data.

The source code is available publicly so that developers and privacy-conscious users can inspect the architecture, understand the storage model, and contribute improvements.

Repository:

**https://github.com/Joshinx17/micro-journaling-app**

---

# Project Philosophy

MindLog is based on a simple thought:

> **Your private thoughts shouldn't need a social network.**

Technology has made it incredibly easy to store everything online.

But convenience can sometimes hide an important question:

**Who actually owns the data?**

MindLog explores a different answer.

Your thoughts can simply be files.

Your journal can simply be a folder.

Your memories can remain readable without a proprietary ecosystem.

And an application can exist to help you interact with your data without needing to own it.

---

# The Bigger Idea

MindLog isn't fundamentally about Markdown.

It isn't fundamentally about Android.

It isn't even fundamentally about journaling.

It is about **digital ownership**.

A personal journal is one of the most intimate forms of personal data.

It can contain:

* private thoughts
* memories
* relationships
* ambitions
* fears
* ideas
* mistakes
* achievements
* personal reflections
* moments that were never meant to become public

That kind of information deserves a different philosophy from an ordinary social-media post.

MindLog is an attempt to build that philosophy into the software itself.

---

# In One Sentence

> **MindLog is a private, offline-first micro-journal that gives you the convenience of a social-media-style personal timeline while keeping your journal as user-controlled, human-readable files instead of turning your private thoughts into platform-owned cloud data.**

---

# Status

**Current version:** 1.0

**Platform:** Android

**Architecture:** Offline-first / local-first

**Storage:** User-selected Markdown files

**Backend:** None

**Account:** Not required

**Analytics:** None

**Advertising:** None

**Cloud sync:** Planned

---

# License

Add the project's chosen license here.

For example:

```text
MIT License
```

See `LICENSE` for the complete license text.

---

## Built With a Simple Principle

**Write freely.**

**Own your data.**

**Keep your memories yours.**

**MindLog.**
