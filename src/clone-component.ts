/*
Component Cloner by Kate Miller (github: katekaho)

Allows users to create a clone of component instances under a new master component

Usage: Select the existing component instances of a master component you would like to clone.
Then hit clone to create a new master component with the instances you selected attached to it

*/


/*-----------------------------------------------------------------------------
HELPER FUNCTIONS
-----------------------------------------------------------------------------*/

function cloneNodeBasedOnType(copy: BaseNode, original: BaseNode) {
    switch (original.type) {
        case 'SLICE':
            copySliceNode(copy, original);
            break;
        case 'FRAME':
        case 'GROUP':
            copyFrameNode(copy, original);
            break;
        case 'INSTANCE':
            copyInstanceNode(copy, original);
            break;
        case 'BOOLEAN_OPERATION':
            copyBooleanOperationNode(copy, original);
            break;
        case 'VECTOR':
            copyVectorNode(copy, original);
            break;
        case 'STAR':
            copyStarNode(copy, original);
            break;
        case 'LINE':
            copyLineNode(copy, original);
            break;
        case 'ELLIPSE':
            copyEllipseNode(copy, original);
            break;
        case 'POLYGON':
            copyPolygonNode(copy, original);
            break;
        case 'RECTANGLE':
            copyRectangleNode(copy, original);
            break;
        case 'TEXT':
            copyTextNode(copy, original);
            break;
        default:
            console.error('Some other node type, need to add functionality');
    }
}

const clonedNodeXYOffset = 40; // Determines how far the nodes move from the original (x and y)

async function getMasterComponentCopy(node: SceneNode) {
    if (node.type == 'COMPONENT_SET' || node.type == 'COMPONENT') {
        return node.clone()
    }

    if (node.type == 'INSTANCE') {
        const masterCompo = await node.getMainComponentAsync();
        return masterCompo.clone(); // node.masterComponent.clone();
    }
}

interface SuggestionRecord {
    name: string;
    data: any
}

export async function readInstanceSwapProperties(currentPageSelection): Promise<{
    selectedNodeId: string;
    propName?: string;
    instanceId?: string|boolean;  
    instanceName?: string;
}[] | null> {


    for (const node of currentPageSelection as SceneNode[]) {
        if (node.type == 'INSTANCE') {

            let collectedProps = [];    

            const nestedInstances = node.findAllWithCriteria({types: ["INSTANCE"]});
            const instancesData: {
                    instanceId: string;
                    instanceName: string;
                    masterId: string;
            }[] = [];

            for(const instanceNode of nestedInstances) {
                const mainComp = await instanceNode.getMainComponentAsync();
                instancesData.push({
                    instanceId: instanceNode.id,
                    instanceName: instanceNode.name,
                    masterId: mainComp.id
                })
            }


            const componentProperties = node.componentProperties;

            for(const componentPropName in componentProperties) {
                const componentProp = componentProperties[componentPropName];
                if(componentProp.type == 'INSTANCE_SWAP') {

                    const instanceData = instancesData.find(({instanceId, masterId}) => {
                        return masterId == componentProp.value;
                    })

                    collectedProps.push({
                        selectedNodeId: node.id,
                        propName: componentPropName.split('#')[0],
                        instanceId: instanceData.instanceId,
                        instanceName: instanceData.instanceName
                    })
                }
            }

            if(collectedProps.length) {
                return collectedProps
            }
            debugger;

        }
    }

    return null;
    

    // Automatically selects the newly created master and child nodes
    // FUTURE: Move the master near the child nodes by default
    // figma.currentPage.selection = selection;

    // Set viewport to cloned nodes
    // figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
}


export async function instanceToLocalComponent(currentPageSelection: SceneNode[]) {
    let selection = [];
    for (const node of currentPageSelection) {
        if (node.type == 'INSTANCE') {
            const clone = node.clone().detachInstance();
            const masterCopy = figma.createComponentFromNode(clone);

            node.resetOverrides();
            node.swapComponent(masterCopy);

            masterCopy.x = node.absoluteRenderBounds.x + clonedNodeXYOffset;
            masterCopy.y = node.absoluteRenderBounds.y + clonedNodeXYOffset;

            selection.push(masterCopy);
        }
    }
    // Automatically selects the newly created master and child nodes
    // FUTURE: Move the master near the child nodes by default
    figma.currentPage.selection = selection;

    // Set viewport to cloned nodes
    figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
}

export async function cloneNodes(currentPageSelection) {

    let newMasterComponent: ComponentNode | ComponentSetNode;
    let selection = [];
    let masterAssigned = false;

    

    for (const node of currentPageSelection as SceneNode[]) {

        const masterCopy = await getMasterComponentCopy(node);
        selection.push(masterCopy);

        if (node.type == 'INSTANCE' && masterCopy.type == 'COMPONENT') {
            // node.swapComponent(masterCopy);
            masterCopy.x = node.absoluteRenderBounds.x + clonedNodeXYOffset;
            masterCopy.y = node.absoluteRenderBounds.y + clonedNodeXYOffset;
        }
        else {
            masterCopy.x = masterCopy.x + clonedNodeXYOffset;
            masterCopy.y = masterCopy.y + clonedNodeXYOffset;
        }
    }

    // Automatically selects the newly created master and child nodes
    // FUTURE: Move the master near the child nodes by default
    figma.currentPage.selection = selection;

    // Set viewport to cloned nodes
    figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);

}

/*-----------------------------------------------------------------------------
END OF HELPER FUNCTIONS
-----------------------------------------------------------------------------*/

/*-----------------------------------------------------------------------------
NODE COPYING FUNCTIONS
-------------------------------------------------------------------------------
The following are helper functions that copy different Node types needed for  
this plugin from the original instances

Commented out fields means they can't be copied since they are instances
-----------------------------------------------------------------------------*/

function copyFrameNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    // copy['backgroundStyleId'] = original['backgroundStyleId'];
    // copy['backgrounds'] = original['backgrounds'];
    copy['blendMode'] = original['blendMode'];
    // copy['constrainProportions'] = original['constrainProportions'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    // copy['expanded'] = original['expanded'];
    copy['exportSettings'] = original['exportSettings'];
    // copy['isMask'] = original['isMask'];
    // copy['layoutAlign'] = original['layoutAlign'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['parent'] = original['parent'];
    // copy['reactions'] = original['reactions'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];

    // Copy each child
    let currentChild = 0;
    original['children'].forEach(childNode => {
        cloneNodeBasedOnType(copy['children'][currentChild++], childNode);
    });
}

function copyVectorNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['blendMode'] = original['blendMode'];
    // copy['constraints'] = original['constraints'];
    if (original['cornerRadius'] !== figma.mixed) {
        copy['cornerRadius'] = original['cornerRadius'];
    }
    copy['cornerSmoothing'] = original['cornerSmoothing'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['handleMirroring'] = original['handleMirroring'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    // If any fields are mixed, don't copy for now
    if (original['strokeCap'] !== figma.mixed) {
        copy['strokeCap'] = original['strokeCap'];
    }
    if (original['strokeJoin'] !== figma.mixed) {
        copy['strokeJoin'] = original['strokeJoin'];
    }
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    // copy['vectorNetwork'] = original['vectorNetwork'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];

}

function copyBooleanOperationNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['backgrounds'] = original['backgrounds'];
    copy['blendMode'] = original['blendMode'];
    copy['booleanOperation'] = original['booleanOperation'];
    // copy['constraints'] = original['constraints'];
    // copy['cornerRadius'] = original['cornerRadius'];
    // copy['cornerSmoothing'] = original['cornerSmoothing'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];

    // Copy each child
    let currentChild = 0;
    original['children'].forEach(childNode => {
        cloneNodeBasedOnType(copy['children'][currentChild++], childNode);
    });
    return;
}

function copyStarNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['blendMode'] = original['blendMode'];
    // copy['constraints'] = original['constraints'];
    copy['cornerRadius'] = original['cornerRadius'];
    copy['cornerSmoothing'] = original['cornerSmoothing'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['height'] = original['height'];
    // copy['innerRadius'] = original['innerRadius'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['pointCount'] = original['pointCount'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
}

function copyLineNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['blendMode'] = original['blendMode'];
    // copy['constraints'] = original['constraints'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
}

function copyEllipseNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    // copy['arcData'] = original['arcData'];
    copy['blendMode'] = original['blendMode'];
    // copy['constraints'] = original['constraints'];
    // copy['cornerRadius'] = original['cornerRadius'];
    // copy['cornerSmoothing'] = original['cornerSmoothing'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
}

function copyPolygonNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['blendMode'] = original['blendMode'];
    // copy['constraints'] = original['constraints'];
    // copy['cornerRadius'] = original['cornerRadius'];
    // copy['cornerSmoothing'] = original['cornerSmoothing'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
}

function copyRectangleNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    // copy['backgrounds'] = original['backgrounds'];
    copy['blendMode'] = original['blendMode'];
    // copy['bottomLeftRadius'] = original['bottomLeftRadius'];
    // copy['bottomRightRadius'] = original['bottomRightRadius'];
    // copy['constraints'] = original['constraints'];
    if (original['cornerRadius'] !== figma.mixed) {
        copy['cornerRadius'] = original['cornerRadius'];
    }
    if (original['cornerSmoothing'] !== figma.mixed) {
        copy['cornerSmoothing'] = original['cornerSmoothing'];
    }
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['fillStyleId'] = original['fillStyleId'];
    copy['fills'] = original['fills'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
    return;
}

function copyTextNode(copy, original) {
    // Doesn't support Advanced Type Features, Numbers

    // Load original and new font then modify once complete
    if (original['fontName'] !== figma.mixed) {
        Promise.all([figma.loadFontAsync(copy['fontName']), figma.loadFontAsync(original['fontName'])])
            .then(() => {
                copy['characters'] = original['characters'];
                if (original['fontName'] !== figma.mixed) {
                    copy['fontName'] = original['fontName'];
                }
                if (original['fontSize'] !== figma.mixed) {
                    copy['fontSize'] = original['fontSize'];
                }
                if (original['letterSpacing'] !== figma.mixed) {
                    copy['letterSpacing'] = original['letterSpacing'];
                }
                if (original['lineHeight'] !== figma.mixed) {
                    copy['lineHeight'] = original['lineHeight'];
                }
                copy['paragraphIndent'] = original['paragraphIndent'];
                copy['paragraphSpacing'] = original['paragraphSpacing'];
                copy['textAlignHorizontal'] = original['textAlignHorizontal'];
                copy['textAlignVertical'] = original['textAlignVertical'];
                copy['textAutoResize'] = original['textAutoResize'];
                if (original['textCase'] !== figma.mixed) {
                    copy['textCase'] = original['textCase'];
                }
                if (original['textDecoration'] !== figma.mixed) {
                    copy['textDecoration'] = original['textDecoration'];
                }
                if (original['textStyleId'] !== figma.mixed) {
                    copy['textStyleId'] = original['textStyleId'];
                }
            }).catch((err) => {
                console.error("Clone plugin error: function copyTextNode() error: promise failed");
                console.error(err)
            });
    }

    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['autoRename'] = original['autoRename'];
    copy['blendMode'] = original['blendMode'];
    // copy['constraints'] = original['constraints'];
    copy['dashPattern'] = original['dashPattern'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    if (original['fillStyleId'] !== figma.mixed) {
        copy['fillStyleId'] = original['fillStyleId'];
    }
    if (original['fills'] !== figma.mixed) {
        copy['fills'] = original['fills'];
    }
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['parent'] = original['parent'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['strokeAlign'] = original['strokeAlign'];
    copy['strokeCap'] = original['strokeCap'];
    copy['strokeJoin'] = original['strokeJoin'];
    copy['strokeStyleId'] = original['strokeStyleId'];
    copy['strokeWeight'] = original['strokeWeight'];
    copy['strokes'] = original['strokes'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
    return;
}

function copySliceNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    // copy['constraints'] = original['constraints'];
    copy['exportSettings'] = original['exportSettings'];
    // copy['height'] = original['height'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    // copy['relativeTransform'] = original['relativeTransform'];
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
    return;
}

function copyInstanceNode(copy, original) {
    // copy['absoluteTransform'] = original['absoluteTransform'];
    copy['backgroundStyleId'] = original['backgroundStyleId'];
    copy['backgrounds'] = original['backgrounds'];
    copy['blendMode'] = original['blendMode'];
    // copy['bottomLeftRadius'] = original['bottomLeftRadius'];
    // copy['bottomRightRadius'] = original['bottomRightRadius'];
    copy['blendMode'] = original['blendMode'];
    copy['clipsContent'] = original['clipsContent'];
    copy['effectStyleId'] = original['effectStyleId'];
    copy['effects'] = original['effects'];
    copy['exportSettings'] = original['exportSettings'];
    copy['gridStyleId'] = original['gridStyleId'];
    copy['guides'] = original['guides'];
    // copy['height'] = original['height'];
    // copy['isMask'] = original['isMask'];
    copy['layoutGrids'] = original['layoutGrids'];
    copy['locked'] = original['locked'];
    copy['name'] = original['name'];
    copy['opacity'] = original['opacity'];
    // copy['parent'] = original['parent'];
    // copy['relativeTransform'] = original['relativeTransform']; // This varies by base or child
    // copy['removed'] = original['removed'];
    // copy['rotation'] = original['rotation'];
    // copy['type'] = original['type'];
    copy['visible'] = original['visible'];
    // copy['width'] = original['width'];
    // copy['x'] = original['x'];
    // copy['y'] = original['y'];
    // Copy each child
    let currentChild = 0;
    original['children'].forEach(childNode => {
        cloneNodeBasedOnType(copy['children'][currentChild++], childNode);
    });
    return;
}

/*-----------------------------------------------------------------------------
END OF NODE COPYING FUNCTIONS
-----------------------------------------------------------------------------*/