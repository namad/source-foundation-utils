import { delayAsync } from "./utils/delay-async";
import { _clone } from "./utils/clone";

let totalLayersCount = 0;
let reboundLayersCount = 0;
let skippedLayersCount = 0;
let missingLayersCount = 0;

export async function exportComponentTemplates() {


    totalLayersCount = 0;
    reboundLayersCount = 0;
    skippedLayersCount = 0;

    let _nodes = [];
    figma.skipInvisibleInstanceChildren = false;

    if (figma.currentPage.selection.length == 0) {
        figma.notify("Select at least one layer and try again");
        return false;    
    }

    figma.currentPage.selection.forEach((node: SceneNode) => {

        if(node.type == "COMPONENT") {
            _nodes.push(node);
            return;
        }

        if ('findAllWithCriteria' in node) {
            const componentNodes = node.findAllWithCriteria({types: ["COMPONENT"]});
            _nodes = _nodes.concat(componentNodes);
        }
        
    });

    const containerFrame = createFrameNode({
        name: `Component Templates ${new Date().toUTCString()}`, 
        layoutMode: 'VERTICAL',
        layoutSizingHorizontal: 'HUG',
        layoutSizingVertical: 'HUG',
        itemSpacing: 44,
        paddingBottom: 96,
        paddingLeft: 96,
        paddingRight: 96,
        paddingTop: 96,
        topLeftRadius: 22,
        topRightRadius: 22,
        bottomLeftRadius: 22,
        bottomRightRadius: 22,    
    });

    console.log(_nodes);
    const total = _nodes.length;
    totalLayersCount = total;

    while(_nodes.length) {
        const componentNode = _nodes.shift();
        // (70 - 44) / 70
        const percent = Math.round(((total - _nodes.length) / total) * 100);
        const msg = `${percent}% done. Working on layer ${total - _nodes.length} out of ${total}`
        console.log(msg);


        const componentCopy = await processComponentNode(componentNode);
        containerFrame.appendChild(componentCopy);
        await delayAsync(10);
    }

    figma.currentPage.selection = [containerFrame];
    figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
    return total;

}


async function processComponentNode(componentNode: ComponentNode): Promise<SceneNode> {
    let parent: FrameNode;

    if(componentNode.parent.type == 'COMPONENT_SET') {
        parent = await getComponentSetFrame(componentNode.parent);
    }

    const frame = convertInstanceToFrame(componentNode);

    if(parent) {
        parent.appendChild(frame)
        frame.x = componentNode.x;
        frame.y = componentNode.y;
        return parent
    }

    return frame;
}


function convertInstanceToFrame(node: ComponentNode) {
    const instance = node.createInstance();
    const frame = instance.detachInstance();
    frame.name = node.name;
    return frame;
}

const componentSetFramesCache = new Map<string, FrameNode>();

async function getComponentSetFrame(cmpSet: ComponentSetNode) {
    const chachedFrame = componentSetFramesCache.get(cmpSet.name);

    if(chachedFrame) {
        return chachedFrame;
    }

    const frame = createFrameNode();
    frame.name = cmpSet.name;
    frame.resize(cmpSet.width, cmpSet.height);

    componentSetFramesCache.set(cmpSet.name, frame);

    figma.currentPage.selection = [frame];

    return frame;
    
}

function createFrameNode(options?) {
    const defaults = Object.assign({
        fills: [
            { type: "SOLID", color: {r: 1, g: 1, b: 1}}
        ],
        topLeftRadius: 16,
        topRightRadius: 16,
        bottomLeftRadius: 16,
        bottomRightRadius: 16,
        x: -10000,
        y: -10000,

    }, options || {});

    const frame = figma.createFrame();

    Object.assign(frame, defaults);

    return frame;
}

