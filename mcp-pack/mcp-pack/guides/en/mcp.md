---
title: "MCP Server"
description: "Connect your AI editor or assistant to the CBPay documentation with one click"
slug: en/mcp
lang: en
source_url: https://docs.cbpayapp.com/en/mcp
---
CBPay ships an official [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server at
`https://mcp.cbpayapp.com`. Add it to Cursor, VS Code, Claude or any MCP-compatible
client and your AI assistant can search this documentation, read every endpoint with
its real request/response examples and look up error codes — without leaving your editor.

It is **documentation only and read-only**: it never calls the live API, never needs an
API key, and requires **no authentication**. The transport is streamable HTTP.

## One-click install

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=cbpay-docs&config=eyJ1cmwiOiJodHRwczovL21jcC5jYnBheWFwcC5jb20ifQ%3D%3D">
</a>

<a href="vscode:mcp/install?%7B%22name%22%3A%22cbpay-docs%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.cbpayapp.com%22%7D">
</a>

<a href="vscode-insiders:mcp/install?%7B%22name%22%3A%22cbpay-docs%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.cbpayapp.com%22%7D">
</a>

## Setup by client

#### Cursor
    Click the **Add to Cursor** button above and confirm the install, or add the
    server manually to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` in your
    project:

    ```json mcp.json
    {
      "mcpServers": {
        "cbpay-docs": {
          "url": "https://mcp.cbpayapp.com"
        }
      }
    }
    ```

    The server appears in **Settings → MCP** with its tools ready to use.
#### Claude Code
    One command from your terminal:

    ```bash
    claude mcp add --transport http cbpay-docs https://mcp.cbpayapp.com
    ```

    Verify with `claude mcp list` — `cbpay-docs` should show as connected.
#### Claude (web & Desktop)
    On [claude.ai](https://claude.ai) or in Claude Desktop:

    1. Open **Settings → Connectors**.
    2. Click **Add custom connector**.
    3. Name it `cbpay-docs` and paste the URL `https://mcp.cbpayapp.com`.
    4. Save — no authentication step is required.
#### VS Code
    Click the **VS Code** button above, or add the server manually to your user
    `mcp.json` (**Command Palette → MCP: Open User Configuration**):

    ```json mcp.json
    {
      "servers": {
        "cbpay-docs": {
          "type": "http",
          "url": "https://mcp.cbpayapp.com"
        }
      }
    }
    ```

    GitHub Copilot Chat (agent mode) picks up the tools automatically.
#### ChatGPT
    In ChatGPT (paid plans, with developer mode enabled):

    1. Open **Settings → Connectors → Advanced → Developer mode**.
    2. Click **Create** and paste `https://mcp.cbpayapp.com` as the MCP server URL.
    3. Set authentication to **None** and save.
#### Other clients
    Any MCP client that supports remote servers over streamable HTTP works. The
    generic configuration is:

    ```json
    {
      "mcpServers": {
        "cbpay-docs": {
          "url": "https://mcp.cbpayapp.com"
        }
      }
    }
    ```

    No API key, no headers, no OAuth — just the URL.
## Available tools

| Tool | What it does |
|---|---|
| `search_docs` | Searches the documentation (sections and endpoints) and returns results ranked by relevance |
| `list_sections` | Lists the table of contents with each section id and group |
| `get_section` | Returns the full markdown of a section, including its subsections |
| `list_endpoints` | Lists the documented endpoints, filterable by group and/or HTTP method |
| `get_endpoint` | Returns the documentation of one endpoint with its curl, request and response examples |
| `list_groups` | Lists the products/groups (payouts, payins, banking, crypto, …) with their endpoint counts |
| `get_errors_catalog` | Returns the API error catalog (HTTP code, `error` code, meaning and category), filterable by text |
| `get_quickstart` | Returns the end-to-end integration quickstart |
| `list_recipes` | Lists the available integration recipes |
| `get_recipe` | Returns one complete integration recipe |
| `list_webhook_events` | Lists the documented webhook event types and summaries |
| `get_webhook_event` | Returns one webhook event with its description and payload example |
| `get_testing_guide` | Returns test/live environments, key prefixes and simulator magic values |
| `whats_new` | Returns the latest published documentation changes |

## Prompts to try

Once connected, ask your assistant things like:

- "Using the CBPay docs, show me how to create a payout to Chile with curl."
- "What does the `idempotency_key_required` error mean and how do I fix it?"
- "List every payins endpoint and explain the QR flow for Bolivia."
- "How do I verify the signature of a CBPay webhook?"

## FAQ

#### Do I need an API key or account?
    No. The MCP server is public and serves documentation only. Your CBPay API key
    is never involved — keep it for your integration code.
#### Can it execute operations against my account?
    No. The server is strictly read-only over documentation content: it cannot
    create payouts, move balances or touch the live API in any way.
#### Which transport does it use?
    Streamable HTTP at `https://mcp.cbpayapp.com`. Clients that only support
    stdio-based local servers can bridge it with a proxy such as `mcp-remote`.
#### How is this different from Postman or the site search?
    Same content, different consumer: the [Postman collection](https://docs.cbpayapp.com/en/postman) is for
    humans testing requests, the site search is for humans reading — the MCP server
    is for your AI assistant, so it can answer integration questions with the real
    documented behavior instead of guessing.
#### Is the content always up to date?
    Yes — it is generated from the same documentation you are reading, so every
    release listed in the [changelog](https://docs.cbpayapp.com/en/changelog) is reflected in the MCP
    content as well.
#### Is there an MCP server for the organization admin docs?
    Yes — a dedicated MCP server for the **organization administration**
    documentation is live at [`mcp-admin.cbpayapp.com`](https://mcp-admin.cbpayapp.com).
    It answers
    questions about the org-admin API (accounts, fees, treasury, compliance)
    and is aimed at organization administrators — this server here keeps
    covering the account-level API your clients integrate.
