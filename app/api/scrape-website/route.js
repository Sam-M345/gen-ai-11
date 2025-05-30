import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the website content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
      "script, style, iframe, nav, footer, header, aside, .advertisement, .ads, #cookie-notice"
    ).remove();

    // Extract the title - try different common selectors
    let title = "";
    const possibleTitleSelectors = [
      "h1",
      ".article-title",
      ".post-title",
      ".entry-title",
      '[data-testid="article-title"]',
      ".headline",
      ".title",
    ];

    for (const selector of possibleTitleSelectors) {
      const titleElement = $(selector).first();
      if (titleElement.length > 0) {
        title = titleElement.text().trim();
        break;
      }
    }

    // If no title found through selectors, try meta tags
    if (!title) {
      title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text();
    }

    // Add this helper function at the top of the file
    function getDomainName(url) {
      try {
        const hostname = new URL(url).hostname;
        // Remove www. and get the main domain name
        const domain = hostname.replace("www.", "").split(".")[0];
        // Capitalize first letter and add 'Finance' for finance.yahoo.com
        if (hostname.includes("finance.yahoo.com")) {
          return "Yahoo Finance";
        }
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch (e) {
        return url;
      }
    }

    // Function to process text nodes and preserve formatting
    function processNode(node) {
      let text = "";

      node.contents().each((_, element) => {
        if (element.type === "text") {
          // Preserve whitespace
          text += element.data;
        } else if (element.type === "tag") {
          const $el = $(element);

          // Handle different HTML elements
          switch (element.name) {
            case "p":
              text += "\n\n" + processNode($el) + "\n\n";
              break;
            case "br":
              text += "\n";
              break;
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6":
              text += "\n\n# " + processNode($el) + "\n\n";
              break;
            case "ul":
              text += "\n";
              $el.find("li").each((i, li) => {
                text += "• " + processNode($(li)) + "\n";
              });
              text += "\n";
              break;
            case "ol":
              text += "\n";
              $el.find("li").each((i, li) => {
                text += `${i + 1}. ` + processNode($(li)) + "\n";
              });
              text += "\n";
              break;
            case "strong":
            case "b":
              text += "**" + processNode($el) + "**";
              break;
            case "em":
            case "i":
              text += "_" + processNode($el) + "_";
              break;
            case "blockquote":
              text += "\n\n> " + processNode($el) + "\n\n";
              break;
            case "code":
              text += "`" + processNode($el) + "`";
              break;
            case "pre":
              text += "\n```\n" + processNode($el) + "\n```\n";
              break;
            case "a":
              const href = $el.attr("href");
              if (href && href.startsWith("http")) {
                // Get domain name for the link text
                const siteName = getDomainName(href);
                text += `[${siteName}](${href})`;
              } else {
                // For non-http links or no href, use the link text
                text += `[${processNode($el)}](${href || ""})`;
              }
              break;
            case "table":
              // Convert table to markdown table
              const tableContent = [];
              $el.find("tr").each((i, row) => {
                const rowContent = [];
                $(row)
                  .find("th, td")
                  .each((j, cell) => {
                    rowContent.push(processNode($(cell)).trim());
                  });
                tableContent.push(rowContent.join(" | "));
                if (i === 0) {
                  tableContent.push(
                    "-"
                      .repeat(rowContent.length * 3)
                      .split("")
                      .join(" | ")
                  );
                }
              });
              text += "\n\n" + tableContent.join("\n") + "\n\n";
              break;
            default:
              text += processNode($el);
          }
        }
      });

      return text;
    }

    // Process the main content area
    let mainContent = $(
      "main, article, .content, #content, .main, #main, .article, #article"
    );
    if (mainContent.length === 0) {
      // If no main content area found, use body
      mainContent = $("body");
    }

    let text = processNode(mainContent)
      // Clean up excessive whitespace while preserving intentional line breaks
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();

    // Construct the final content with the title
    const finalContent = title ? `# ${title}\n\n${text}` : text;

    // Limit content length if needed
    const MAX_CHARS = 100000;
    if (finalContent.length > MAX_CHARS) {
      const truncatedContent =
        finalContent.substring(0, MAX_CHARS) + "\n\n... (content truncated)";
      return NextResponse.json({
        content: truncatedContent,
      });
    }

    return NextResponse.json({
      content: finalContent,
    });
  } catch (error) {
    console.error("Website scraping error:", error);
    return NextResponse.json(
      { error: "Failed to read website: " + error.message },
      { status: 500 }
    );
  }
}
