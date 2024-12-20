import { delayAsync } from "./utils/delay-async";
import { _clone } from "./utils/clone";
import { findFigmaVariableByName } from "./utils/figma-variables";
import { bindPropertyVariables, findVariableMatch } from "./utils/swap-variables";

let totalLayersCount = 0;
let reboundLayersCount = 0;
let skippedLayersCount = 0;
let missingLayersCount = 0;

//cache all component sets to speed up the process
let componentSets: (ComponentNode | ComponentSetNode)[]

async function getComponentSets() {
    if (!componentSets) {
        console.log(`First time look up, running slow...`)

        figma.skipInvisibleInstanceChildren = true;
        await figma.currentPage.loadAsync();
        componentSets = figma.currentPage.findAllWithCriteria({
            types: ['COMPONENT', 'COMPONENT_SET']
        });
    }
    return componentSets;
}


async function findComponent(cmpName: string): Promise<ComponentNode | ComponentSetNode> {
    let componentSets = await getComponentSets();  
    let masterComponent = componentSets.find(item => item.name === cmpName);
    
    return masterComponent || null;
}

export async function importComponentTemplates(overwrite = false) {
    totalLayersCount = 0;
    reboundLayersCount = 0;
    skippedLayersCount = 0;

    let _nodes: SceneNode[] = [];


    if (figma.currentPage.selection.length == 0) {
        figma.notify("Select at least one layer and try again");
        return false;
    }

    figma.currentPage.selection.forEach((node: SceneNode) => {
        if ('children' in node) {
            _nodes = _nodes.concat(node.children);
        }
    });

    console.log(_nodes);

    let matches: {
        source: FrameNode,
        target: ComponentNode | ComponentSetNode
    }[] = [];


    for (const node of _nodes) {
        if (node.type != 'FRAME' || node.visible != true) {
            continue; // skip everyting that is not a regular frame
        }
        const componentNode = await findComponent(node.name);
        if (componentNode) {
            matches.push({
                source: node as FrameNode,
                target: componentNode
            })
        }
        else {
            console.warn(`Cannot find component node ${node.name}`)
        }
    }

    const total = matches.length;
    totalLayersCount = total;

    while (matches.length) {
        const matchData = matches.shift();
        const percent = Math.round(((total - matches.length) / total) * 100);
        const msg = `${percent}% done. Working on layer ${total - matches.length} out of ${total}`;

        if(percent > 60) debugger
        
        console.log(msg);

        if (matchData.target.type == 'COMPONENT_SET') {
            for (const sourceFrame of matchData.source.children) {
                const target = matchData.target.findChild(n => n.name === sourceFrame.name);
                if (target?.type == 'COMPONENT' && sourceFrame.type == 'FRAME') {
                    await processNode(sourceFrame, target, overwrite);
                }
            }
        }
        else {
            await processNode(matchData.source, matchData.target, overwrite);
        }


    }
    return total;

}

async function overwriteContents(sourceFrame: FrameNode | InstanceNode, targetComponent: ComponentNode) {
    // remove all children from the target component node
    for (const node of targetComponent.children) {
        node.remove();
    }
    for (const node of sourceFrame.children) {
        const clone = node.clone();
        targetComponent.appendChild(clone);
    }
    await delayAsync(10);
    return;
}

async function processNode(sourceFrame: FrameNode | InstanceNode, targetComponent: ComponentNode, overwrite = false) {
    if (overwrite === true) {
        return await overwriteContents(sourceFrame, targetComponent);
    }

    await copyStyles(sourceFrame, targetComponent);
    await bindVairables(sourceFrame, targetComponent);


    let index = 0;
    for (const sourceNode of sourceFrame.children) {
        figma.skipInvisibleInstanceChildren = false;
        let targetNode = targetComponent.findOne(n => n.name === sourceNode.name);

        if (!targetNode) {
            // copy a component and insert it into the same position as it is in sourceFrame
            const clone = sourceNode.clone();
            targetComponent.insertChild(index++, clone);
            return;
        }

        resizeAndReposition(sourceNode, targetNode);

        if(sourceNode.type == 'VECTOR' && targetNode.type == 'VECTOR') {
            await mergeVectors(sourceNode, targetNode);
        }

        if (sourceNode.type == 'INSTANCE' && targetNode.type == 'INSTANCE') {
            await copyOverrides(sourceNode, targetNode, targetComponent);
        }
        if (
            sourceNode.type == 'FRAME' && targetNode.type == 'FRAME' ||
            sourceNode.type == 'INSTANCE' && targetNode.type == 'INSTANCE' ||
            sourceNode.type == 'BOOLEAN_OPERATION' && targetNode.type == 'BOOLEAN_OPERATION' || 
            sourceNode.type == 'VECTOR' && targetNode.type == 'VECTOR'
        ) {
            await copyNodeProps(sourceNode, targetNode);
        }
    }

    await delayAsync(10);
}

async function copyNodeProps(sourceNode: FrameNode | BooleanOperationNode | InstanceNode | VectorNode, targetNode: FrameNode | BooleanOperationNode | InstanceNode | VectorNode) {
    targetNode.fills = _clone(sourceNode.fills);
    targetNode.effects = _clone(sourceNode.effects);
    targetNode.strokes = _clone(sourceNode.strokes);
    targetNode.opacity = _clone(sourceNode.opacity);
    targetNode.visible = _clone(sourceNode.visible);
    targetNode.isMask = _clone(sourceNode.isMask);
    targetNode.strokeAlign = _clone(sourceNode.strokeAlign);
    targetNode.blendMode = _clone(sourceNode.blendMode);

    targetNode.strokeAlign = _clone(sourceNode.strokeAlign);
    targetNode.strokeCap = _clone(sourceNode.strokeCap);
    targetNode.strokeJoin = _clone(sourceNode.strokeJoin);
    targetNode.strokeMiterLimit = _clone(sourceNode.strokeMiterLimit);
    targetNode.strokeWeight = _clone(sourceNode.strokeWeight);

    if (sourceNode.type == 'FRAME' && targetNode.type == 'FRAME') {
        targetNode.constraints = _clone(sourceNode.constraints);
        targetNode.layoutGrids = _clone(sourceNode.layoutGrids);
        targetNode.strokeBottomWeight = _clone(sourceNode.strokeBottomWeight);
        targetNode.strokeLeftWeight = _clone(sourceNode.strokeLeftWeight);
        targetNode.strokeRightWeight = _clone(sourceNode.strokeRightWeight);
        targetNode.strokeTopWeight = _clone(sourceNode.strokeTopWeight);
    }

    await copyStyles(sourceNode, targetNode);
    await bindVairables(sourceNode, targetNode);
}

async function bindVairables(sourceFrame: SceneNode, targetComponent: SceneNode) {
    const boundVairables = Object.entries(sourceFrame.boundVariables);
    return await Promise.all(boundVairables.map(async ([propName, varBinding]) => {
        return await bindVariable(sourceFrame, targetComponent, propName, varBinding).catch((err) => {
            return err + `${propName}`;
        });
    })).catch(function (err) {
        console.log(err.message); // some coding error in handling happened
    });
}

function resizeAndReposition(sourceNode: SceneNode, targetNode: SceneNode) {
    if (targetNode == null) {
        return;
    }

    if (sourceNode.type == 'BOOLEAN_OPERATION') {
        sourceNode.children.forEach(source => {
            if ('findOne' in targetNode) {
                const target = targetNode.findOne(n => n.name === source.name);
                resizeAndReposition(source, target);
            }
        })

    }
    else {
        targetNode.x = sourceNode.x;
        targetNode.y = sourceNode.y;

        if ('resize' in targetNode) {
            targetNode.resize(sourceNode.width, sourceNode.height);
        }
    }
}

function copyComponentProps(source: InstanceNode, target: InstanceNode) {
    // COPY COMPONENT PROPS ----------------
    const sourceComponentProps = source.componentProperties;
    const propsCopy = {};

    Object.keys(sourceComponentProps).forEach(key => {
        propsCopy[key] = sourceComponentProps[key].value;

    })
    target.setProperties(propsCopy);
}

async function copyOverrides(sourceNode: InstanceNode, targetNode: SceneNode, targetComponent: ComponentNode) {
    if (targetNode.type == 'INSTANCE') {
        // SWAP INSTANCES ---------------------
        const sourceMainComp = await sourceNode.getMainComponentAsync();
        const targetMainComp = await targetNode.getMainComponentAsync();

        const doSwap = sourceMainComp.id !== targetMainComp.id;
        if (doSwap) {
            targetNode.swapComponent(sourceMainComp);
        }
        copyComponentProps(sourceNode, targetNode);
    }

    for (const prop of sourceNode.overrides) {
        const type = targetNode.type;

        if (
            type != 'FRAME' &&
            type != 'BOOLEAN_OPERATION' &&
            type != 'COMPONENT_SET' &&
            type != 'COMPONENT' &&
            type != 'INSTANCE' &&
            type != 'GROUP' &&
            type != 'SECTION') {
            return;
        }

        const source = await figma.getNodeByIdAsync(prop.id) as SceneNode;

        if (!source) debugger

        const fields = prop.overriddenFields;
        const target =  /*source.name == targetNode.name ? targetNode :*/ targetNode.findOne(n => n.name === source.name);

        if (target != null) {
            fields.forEach(field => {
                let propName = field as string;

                if (field == 'stokeTopWeight') {
                    propName = 'strokeTopWeight'
                }

                if (field == 'componentProperties' && source.type == 'INSTANCE' && target.type == 'INSTANCE') {
                    copyComponentProps(source, target);
                }
                else if (
                    propName != 'componentPropertyDefinitions' &&
                    propName != 'height' &&
                    propName != 'overlayBackground' &&
                    propName != 'overlayBackgroundInteraction' &&
                    propName != 'overlayPositionType' &&
                    propName != 'parent' &&
                    propName != 'type' &&
                    propName != 'width' &&
                    propName != 'boundVariables') {


                    if (target[propName] != source[propName]) {
                        console.log(`applying ${propName}:${source[propName]} to ${source.name}`);
                        target[propName] = _clone(source[propName]);
                    }
                }

            });

            await bindVairables(source, target);
        }
    }

}

async function copyStyles(sourceFrame: SceneNode, targetComponent: SceneNode) {
    if ('effectStyleId' in sourceFrame && 'effectStyleId' in targetComponent) {
        await targetComponent.setEffectStyleIdAsync(sourceFrame.effectStyleId);
    }
    if ('gridStyleId' in sourceFrame && 'gridStyleId' in targetComponent) {
        await targetComponent.setGridStyleIdAsync(sourceFrame.gridStyleId);
    }
    if ('fillStyleId' in sourceFrame && 'fillStyleId' in targetComponent) {
        await targetComponent.setFillStyleIdAsync(sourceFrame.fillStyleId as string);
    }
    if ('strokeStyleId' in sourceFrame && 'strokeStyleId' in targetComponent) {
        await targetComponent.setStrokeStyleIdAsync(sourceFrame.strokeStyleId);
    }
}

async function bindVariable(sourceFrame: SceneNode, targetComponent: SceneNode, propName: any, variableBinding: any): Promise<SceneNode> {
    if (propName == 'fills' && 'fills' in sourceFrame && 'fills' in targetComponent && !targetComponent['fillStyleId']) {
        targetComponent.fills = await bindPropertyVariables(sourceFrame.fills, figma.variables.setBoundVariableForPaint);
    }
    else if (propName == 'strokes' && 'strokes' in sourceFrame && 'strokes' in targetComponent && !targetComponent['strokeStyleId']) {
        targetComponent.strokes = await bindPropertyVariables(sourceFrame.strokes, figma.variables.setBoundVariableForPaint);
    }
    else if (propName == 'effects' && 'effects' in sourceFrame && 'effects' in targetComponent && !targetComponent['effectStyleId']) {
        targetComponent.effects = await bindPropertyVariables(sourceFrame.effects, figma.variables.setBoundVariableForEffect);
    }
    else if (propName == 'layoutGrids' && 'layoutGrids' in sourceFrame && 'layoutGrids' in targetComponent) {
        targetComponent.layoutGrids = await bindPropertyVariables(sourceFrame.layoutGrids, figma.variables.setBoundVariableForLayoutGrid);
    }
    else if (propName == 'componentProperties' || propName == 'textRangeFills') {
        console.warn(`Swap does not work for ${propName}, skipping node`);
    }
    else {
        const variable = await findVariableMatch(variableBinding.id);
        if (variable) {
            var alias = targetComponent.boundVariables[propName] as VariableAlias;
            if (variable.id != alias.id) {
                targetComponent.setBoundVariable(propName, null);
                targetComponent.setBoundVariable(propName, variable.id);
            }
        }
    }

    return targetComponent;
}

async function mergeVectors(sourceNode: VectorNode, targetNode: VectorNode) {
    const sourceVectorNetwork = _clone(sourceNode.vectorNetwork);
    await targetNode.setVectorNetworkAsync(sourceVectorNetwork);
}

