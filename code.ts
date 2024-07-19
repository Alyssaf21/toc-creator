// DONE! : Ignore leading emojis on page names
// DONE! : Retain user-inputted file link upon startup and show corresponding file name
// DONE! : Ignore frames with no name / only whitespace as name
// NEXT STEP: Undo file link fix but retain code for user input (for later)
// NEXT STEP: Select & Zoom to TOC after running
// NEXT STEP: Traverse entire document with exceptions for certain kinds of pages
// ^^ May warrant user input to define which pages are to be skipped. Could hardcode to proof-of-concept it first though
// NICE-TO-HAVES: Prevent user from generating from selection with nothing selected
// NICE-TO-HAVES: Display frame links in reverse order (to match order on Layers Panel)
// NICE-TO-HAVES: Provide more information on how the plugin works, what you can / can't change
// NICE-TO-HAVES: Retain the existing TOC's position when updating (It may do this already...)
// NICE-TO-HAVES: Ignore leading emojis on page/frame names as optional toggle
// NICE-TO-HAVES: User input for exceptions (could be based on frame name)
// NICE-TO-HAVES: User input for styling the TOC
// REACH GOAL: Recognize when frames are positioned inline with each other and group them together on TOC
// CONCEPT: Allow TOC to be generated in-plugin only; does not create a frame on the page, but acts as a floating navigation hub
// ^^ This is basically just the layers panel if you double-click the layer symbols; Should we just focus on organization and education instead? 

/*
  ------------
  7/19/2024: Cleaning up file before publishing updates.
*/

let existingLink = "";
let fileInfo = [];
let nodeType = "FRAME";

// /*
// These functions were only used to get user input, a feature needed before the file key bug was fixed. 

// const fileInfo = new Map();

const setUserInput = async () => {
  if (existingLink.length > 1) {
    await figma.clientStorage.setAsync("link", existingLink);
  } else {
    await figma.clientStorage.setAsync("link", "");
  }
}

function parseFileName(fileLink) {
  let linkString = "https://www.figma.com/file/";
  let fileName = fileLink.split(linkString).splice(1).toString();
  fileName = fileName.split('?')[0];
  fileName = fileName.split('/')[1];
  fileName = fileName.replace(/-/g, " ");
  console.log("File Name: " + fileName);
  return fileName;
}

const getUserInput = async () => {
  existingLink = await figma.clientStorage.getAsync("link");
  if (existingLink.length > 1) {
    console.log("Existing Link available: " + existingLink);
    fileInfo.push(existingLink);
    fileInfo.push(parseFileName(existingLink));
  } else {
    console.log("No Existing Link Found");
  }
}

getUserInput().then(() => {
  figma.showUI(__html__, { themeColors: true, width: 400, height: 450 });
  // figma.ui.postMessage(existingLink);
  figma.ui.postMessage(fileInfo);
})
// */

let tocList = [];
let existingTOC = null;
const emojiRegex = "(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*";


// Checks string to see if it includes any keywords from an array of excluded words.
// If there's a hit, returns true. If clean, returns false.
let pageNameExcludes = ['sandbox', 'meta', 'gfx', 'notes', 'graphics', '🚧', 'graveyard', 'archive', '↳', 'cover', '⬓'];

function checkStringExcludes(str, excludes) {
  excludes.forEach(keyword => {
    if (str.toLowerCase().includes(keyword.toLowerCase())) {
      console.log("Keyword: " + keyword.toLowerCase() + " detected");
      return true;
    }
  });
  return false;
}

function getPageNames() {
  let pages = [];
  figma.root.children.forEach(page => {
    if (!checkStringExcludes(page.name, pageNameExcludes)) {
      console.log("checkStringExcludes: " + checkStringExcludes(page.name, pageNameExcludes));
      pages.push(page.name);
      // console.log("pushing: " + page.name);
    }
  });
  console.log("Figma page children: " + pages);
}

function getFrameLink(nodeID) {
  // For some reason, Figma won't recognize the transfer protocol for section links but will for frame links.
  // So http will work for Sections, but will launch the opening of a browser tab when a link is clicked.
  // https will smoothly pan/zoom/select the linked object without leaving the editor, but doesn't work for sections.  
  let linkString = "https://www.figma.com/file/";
  let fileName = figma.root.name.replace(/ /g, "-"); // Replace all spaces in the file name with "-" to create a link
  fileName = fileName.replace(/ /g, "-"); // Char for non-breaking space. I found one in the title of an Explore Mobile file
  console.log("FileName: " + fileName);
  let ID = nodeID.replace(":", "%3A");
  linkString = linkString + figma.fileKey + "/" + fileName + "?node-id=" + ID;
  return linkString;
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
  // Establishes whether there is an existing TOC
  for (const node of figma.currentPage.children) {
    if (node.name == removeLeadingEmoji(figma.currentPage.name) + " TOC" && node.type === "FRAME" || node.name == "Pages TOC") {
      existingTOC = node;
    }
  }
  for (const node of sourceArr) {
    // Searches for valid nodes (either Frames, Sections, or Pages) to add to the TOC
    if (node.type !== "FRAME" && node.type !== "SECTION" && node.type !== "PAGE") {
      continue;
    }
    else if (node.name.startsWith(".") || node.name.startsWith("_") || node.name.startsWith("Meeting Notes") || node.name.trim().length < 1 || node.visible == false) {
      // Skip if frame starts with ., _, "Meeting Notes", only contains whitespace, or is hidden.
      console.log("FRAME NAME INCLUDES ESC CHAR");
      continue;
    }
    else if (node.name == removeLeadingEmoji(figma.currentPage.name) + " TOC") {
      continue;
    }
    else if (node.children.length == 0) {
      continue;
    }
    else {
      if (nodeType == "FRAME" && node.type === "FRAME") {
        console.log("Node type is FRAME");
        tocList.push(node);
      } else if (nodeType == "SECTION" && node.type === "SECTION") {
        console.log("Node type is SECTION");
        tocList.push(node);
      } else if (node.type === "PAGE") {
        console.log("Node type is PAGE");
        tocList.push(node);
      } else {
        console.log("NEITHER!!!");
      }
    }
  }
  console.log(tocList)
}

// Removes all links from the existing TOC
function clearExistingChildren() {
  if (existingTOC) {
    console.log("Existing Chilren: " + existingTOC.children);
    existingTOC.children.forEach(element => {
      element.remove();
    });
  }
}

function generateLinks() {
  // Create link for each selected frame
  console.log("Generating LInks")
  let linkList = [];
  for (const node of tocList) {
    const linkText = figma.createText();
    linkText.fontName = { family: "Inter", style: "Medium" };
    linkText.fontSize = 16;
    linkText.characters = node.name;
    console.log("Figma HATES this link: " + getFrameLink(node.id));
    linkText.hyperlink = { type: "URL", value: getFrameLink(node.id) };
    linkText.textDecoration = "UNDERLINE";
    linkText.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.5, b: 1 } }];
    linkList.push(linkText);
  }

  const frameTitle = figma.createText();
  frameTitle.characters = removeLeadingEmoji(figma.currentPage.name);
  frameTitle.fontName = { family: "Inter", style: "Bold" };
  frameTitle.fontSize = 20;

  if (nodeType == "PAGE") { frameTitle.characters = "Pages"; }

  if (existingTOC) { // Append links to existing frame
    existingTOC.appendChild(frameTitle);
    for (const link of linkList) { existingTOC.appendChild(link); }
    console.log('APPENDING existingTOC');
    console.log("CURRENT SELECTION: " + figma.currentPage.selection);
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
    console.log(linkList);
    for (const link of linkList) {
      console.log("FORBIDDEN LINK: " + link);
      frame.appendChild(link);
      console.log('APPENDING new TOC');
    }
    figma.currentPage.appendChild(frame);
    console.log("CURRENT SELECTION: " + figma.currentPage.selection);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame])
  }
}

figma.ui.onmessage = msg => {
  loadFonts().then(() => {
    getPageNames();
    if (msg.type === 'generate-toc') {
      console.log("--- GENERATE TOC LAUNCHED ---");
      // console.log("Msg Link: " + msg.link);
      // existingLink = msg.link;
      // console.log("Calling setUserInput");
      // setUserInput().then(() => {
      populateChildArrays(figma.currentPage.children);
      clearExistingChildren();
      generateLinks();
      figma.commitUndo();
      figma.notify("Table of Contents generated for all frames on page", { timeout: 4000, error: false });
      // })
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

    loadFonts().then(() => {
      figma.closePlugin();
    })
  });
};
