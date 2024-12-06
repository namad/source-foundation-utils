import { delayAsync } from "./utils/delay-async";

export async function processComponents() {
    figma.skipInvisibleInstanceChildren = true;
    let pageComponents: ComponentNode[] = [];

    if (figma.currentPage.selection.length) {
        figma.currentPage.selection.forEach((node: any) => {
            if (node.type == 'COMPONENT') {
                pageComponents = pageComponents.concat(node);
            }
            else if (node.findAllWithCriteria) {
                const components = node.findAllWithCriteria({ types: ['COMPONENT'] });
                pageComponents = pageComponents.concat(components);
            }
        })
    }
    else {
        pageComponents = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] });
    }

    const size = pageComponents.length;
    let count = 0;

    while (pageComponents.length) {
        const componentFrame = pageComponents.shift();

        figma.skipInvisibleInstanceChildren = false;
        const children = componentFrame.findAll((n: FrameNode) => {
            return n.layoutPositioning == 'ABSOLUTE'
                && n.width > 0
                && n.height > 0
                && n.constraints.horizontal === 'STRETCH'
                && n.constraints.vertical === 'STRETCH';
        });

        await fixLayers(children as FrameNode[], componentFrame);
        console.log(`%cComponent ${count++} / ${size}`, `color: #0773DF; font-weight: bold;`)
    }
}

export async function processFrames() {
    figma.skipInvisibleInstanceChildren = false;
    let frames: {
        parent: SceneNode;
        children: SceneNode[];
    }[] = [];

    let updated = 0,
        skipped = 0,
        failed = 0;

    if (figma.currentPage.selection.length) {
        figma.currentPage.selection.forEach((parent: SceneNode) => {
            if ('findAll' in parent) {
                const children = parent.findAll((n: FrameNode) => {
                    return n.layoutPositioning == 'ABSOLUTE'
                        && n.width > 0
                        && n.height > 0
                        && n.constraints.horizontal === 'STRETCH'
                        && n.constraints.vertical === 'STRETCH';
                });

                frames.push({ parent, children })
            }
        })
    }

    while (frames.length) {
        const itemToFix = frames.shift();
        const reslt = await fixLayers(itemToFix.children as FrameNode[], itemToFix.parent);

        updated += reslt.updated;
        skipped = reslt.skipped;
        failed = reslt.failed;
    }

    return {
        updated,
        skipped,
        failed 
    };

}

async function fixLayers(nodes: FrameNode[], parentNode?: SceneNode): Promise<{
    updated: number;
    skipped: number;
    failed: number;
}> {
    let node,
        parent,
        offsetX,
        offsetY,
        height,
        width;

    let updated = 0,
        skipped = 0,
        failed = 0;

    try {
        while (nodes.length) {

            console.log(`Remaining nodes: ${nodes.length}`);

            node = nodes.shift();

            if (parentNode && checkInstance(node, parentNode)) {
                skipped++;
                continue;
            }

            // debugger

            parent = node.parent as FrameNode;
            offsetX = node.x;
            offsetY = node.y;
            height = parent.height - 2 * offsetY;
            width = parent.width - 2 * offsetX;

            // node.resize(width * 0.8, height * 0.8);
            // await delayAsync(10);

            node.resize(width, height);
            updated++;

            await delayAsync(10);
        }

        console.log(`Resized: ${updated}, Skipped: ${skipped}`);
    }
    catch (e) {
        failed++;
    }

    return {
        updated,
        skipped,
        failed 
    }
}

function checkInstance(targetFrame, parentFrame?) {
    if (!parentFrame) {
        return false;
    }

    let node = targetFrame.parent;

    while (node != parentFrame) {
        if (node.type == 'INSTANCE') {
            return true;
        }
        node = node.parent;
    }

    return false;
}