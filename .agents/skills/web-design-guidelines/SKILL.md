---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the vendored guidelines in `guidelines.md` (same folder)
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Vendored copy (pinned, do NOT fetch from the network): `guidelines.md` in this folder.
Upstream: vercel-labs/web-interface-guidelines@434b7f9 (command.md), copied 2026-11-14.

## Usage

When a user provides a file or pattern argument:
1. Read `guidelines.md` from this folder
2. Read the specified files
3. Apply all rules from `guidelines.md`
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
