// DONE! : Ignore leading emojis on page names
// DONE! : Retain user-inputted file link upon startup and show corresponding file name
// DONE! : Ignore frames with no name / only whitespace as name
// DONE! : Select & Zoom to TOC after running
// DONE! : Retain the existing TOC's position when updating (It may do this already...)
// NEXT STEP: Undo file link fix but retain code for user input (for later)
// NEXT STEP: Traverse entire document with exceptions for certain kinds of pages
// ^^ May warrant user input to define which pages are to be skipped. Could hardcode to proof-of-concept it first though
// NICE-TO-HAVES: Prevent user from generating from selection with nothing selected
// NICE-TO-HAVES: Display frame links in reverse order (to match order on Layers Panel)
// NICE-TO-HAVES: Provide more information on how the plugin works, what you can / can't change
// NICE-TO-HAVES: Ignore leading emojis on page/frame names as optional toggle
// NICE-TO-HAVES: User input for exceptions (could be based on frame name)
// NICE-TO-HAVES: User input for styling the TOC
// NICE-TO-HAVES: Link back to the TOC when item is clicked? - Not sure if possible. Research needed. Maybe widget idea?
// REACH GOAL: Recognize when frames are positioned inline with each other and group them together on TOC
// CONCEPT: Allow TOC to be generated in-plugin only; does not create a frame on the page, but acts as a floating navigation hub
// ^^ This is basically just the layers panel if you double-click the layer symbols; Should we just focus on organization and education instead? 

let existingLink = "";
let nodeType = "FRAME";
let tocList = [];
let existingTOC = null;
const emojiRegex = "(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*";

var fileLink = ""; // Adding the ability to set the current file link to get file key
const getFileLink = async () => { fileLink = await figma.clientStorage.getAsync("FileLink"); }
const updateFileLink = async () => { await figma.clientStorage.setAsync("FileLink", fileLink); }

function checkStringExcludes(str, excludes) {
  excludes.forEach(keyword => {
    if (str.toLowerCase().includes(keyword.toLowerCase())) {
      console.log("Keyword: " + keyword.toLowerCase() + " detected");
      return true;
    }
  });
  return false;
}

function getFrameLink(nodeID) {
  let ID = nodeID.replace(":", "%3A");
  let linkString = fileLink.split("?node-id=")[0] + "?node-id=" + ID;
  return linkString;
  /* 
  let ID = nodeID.replace(":", "%3A");
  let linkString = "https://www.figma.com/design/";
  let fileName = figma.root.name.replace(/ /g, "-"); // Replace all spaces in the file name with "-" to create a link
  fileName = fileName.replace(/ /g, "-"); // Char for non-breaking space. I found one in the title of an old file once
  linkString = linkString + figma.fileKey + "/" + fileName + "?node-id=" + ID;
  linkString = linkString + figma.fileKey + "/" + fileName + "?node-id=" + ID;
  return linkString;
  */
  // ^^ Above only works with private plugin API (either a local plugin, or plugins published on Organization level)
}

// Gets rid of leading emojis for page names.
function removeLeadingEmoji(str) {
  if (str.search(emojiRegex) == 0) {
    // Get first emoji, figure out actual index length, remove those indexes & leading whitespace 
    let emojiMatch = str.match(emojiRegex);
    str = str.slice(emojiMatch[0].length);
    str = str.trim();
  }
  return str;
}

const loadFonts = async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
}

// Check for existing TOC and add frames on page to tocList
function populateChildArrays(sourceArr) {
  tocList = [];
  existingTOC = null;
  for (const node of figma.currentPage.children) {   // Establishes whether there is an existing TOC
    if ((node.name == removeLeadingEmoji(figma.currentPage.name) + " TOC" || node.name == "Pages TOC") && node.type === "FRAME") {
      existingTOC = node;
    }
  }
  for (const node of sourceArr) {
    // Searches for valid nodes (either Frames, Sections, or Pages) to add to the TOC
    if (node.type !== "FRAME" && node.type !== "SECTION" && node.type !== "PAGE") { continue; }
    // Skip if frame starts with ., _, "Meeting Notes", only contains whitespace, or is hidden. Would like to make this customizable in the future.
    else if (node.name.startsWith(".") || node.name.startsWith("_") || node.name.startsWith("Meeting Notes") || node.name.trim().length < 1 || node.visible == false) { continue; }
    else if (node.name == removeLeadingEmoji(figma.currentPage.name) + " TOC" || node.name == "Pages TOC") { continue; }
    else if (node.children.length == 0) { continue; }
    else {
      if (nodeType == "FRAME" && node.type === "FRAME") { tocList.push(node); }
      else if (nodeType == "SECTION" && node.type === "SECTION") { tocList.push(node); }
      else if (node.type === "PAGE") { tocList.push(node); }
      else if (nodeType == "FRAME OR SECTION" && (node.type === "FRAME" || node.type === "SECTION")) { tocList.push(node); }
      else { console.log("Node type is NOT a frame, section, or page."); }
    }
  }
  console.log(tocList)
}

// Removes all links from the existing TOC
function clearExistingChildren() {
  if (existingTOC) {
    existingTOC.children.forEach(element => { element.remove(); });
  }
}

function generateLinks() {
  // Create link for each selected frame
  console.log("Generating Links")
  let linkList = [];
  for (const node of tocList) {
    const linkText = figma.createText();
    linkText.fontName = { family: "Inter", style: "Medium" };
    linkText.fontSize = 16;
    linkText.characters = node.name;
    linkText.hyperlink = { type: "URL", value: getFrameLink(node.id) };
    linkText.textDecoration = "UNDERLINE";
    linkText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.5, b: 1 } }];
    linkList.push(linkText);
  }

  const frameTitle = figma.createText(); // Creates and styles title
  frameTitle.characters = removeLeadingEmoji(figma.currentPage.name);
  frameTitle.fontName = { family: "Inter", style: "Bold" };
  frameTitle.fontSize = 20;

  if (nodeType == "PAGE") { frameTitle.characters = "Pages"; }

  if (existingTOC) { // Append links to existing frame
    existingTOC.appendChild(frameTitle);
    for (const link of linkList) { existingTOC.appendChild(link); }
    console.log('APPENDING existing TOC');
    figma.currentPage.selection = [existingTOC];
    figma.viewport.scrollAndZoomIntoView([existingTOC])
  }
  else {
    // Create TOC frame
    console.log('Create New TOC frame');
    var frame = figma.createFrame();
    frame.name = frameTitle.characters + " TOC";
    frame.layoutMode = 'VERTICAL';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = 8;
    frame.paddingTop = 20;
    frame.paddingBottom = 20;
    frame.paddingLeft = 20;
    frame.paddingRight = 20;

    frame.appendChild(frameTitle);
    for (const link of linkList) {
      frame.appendChild(link);
      console.log('APPENDING new TOC');
    }
    figma.currentPage.appendChild(frame);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
  }
}

getFileLink().then(() => {
  console.clear();
  figma.showUI(__html__, { themeColors: true, width: 400, height: 450 });
  figma.ui.postMessage(fileLink);
});

figma.ui.onmessage = msg => {
  loadFonts().then(() => {
    console.log("Table of Contents Creator START");

    if (msg.type === 'file-link') {
      fileLink = msg.value;
      updateFileLink();
    }

    if (msg.type === 'generate-toc') {
      console.log("--- FRAMES LAUNCHED ---");
      nodeType = "FRAME";
      populateChildArrays(figma.currentPage.children);
      clearExistingChildren();
      generateLinks();
      figma.commitUndo();
      figma.notify("Table of Contents generated for all frames on page", { timeout: 4000, error: false });
    }

    else if (msg.type === 'pages') {
      console.log("--- PAGES LAUNCHED ---");
      nodeType = "PAGE";
      populateChildArrays(figma.root.children);
      clearExistingChildren();
      generateLinks();
      figma.commitUndo();
      figma.notify("Table of Contents generated for all pages", { timeout: 4000, error: false });
    }

    else if (msg.type === 'selected') {
      console.log("--- SELECTED LAUNCHED ---");
      nodeType = "FRAME OR SECTION";
      populateChildArrays(figma.currentPage.selection);
      clearExistingChildren();
      generateLinks();
      figma.commitUndo();
      figma.notify("Table of Contents generated for selected frames", { timeout: 4000, error: false });
    }

    else if (msg.type === 'sections') {
      console.log("--- SECTIONS LAUNCHED ---");
      nodeType = "SECTION";
      populateChildArrays(figma.currentPage.children);
      clearExistingChildren();
      generateLinks();
      figma.commitUndo();
      figma.notify("Table of Contents generated for all sections on page", { timeout: 4000, error: false });
    }
  });
};
