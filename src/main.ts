import { bindVariablesAndStyles } from './utils/variables-to-styles';
import { processComponents, processFrames } from './fix-layers';
import { updateElevationComponents } from './update-elevation-components';
import { exportComponentTemplates } from './export-component-templates';
import { importComponentTemplates } from './import-component-templates';
import { cloneNodes, instanceToLocalComponent, readInstanceSwapProperties } from './clone-component';
import { delayAsync } from './utils/delay-async';

console.clear();

const paramsSuggestions = {
    "overwrite": [
        {
            name: "Merge contents",
            data: false,
        },
        {
            name: "Overwrite contents",
            data: true,
        },
    ],
    "checkNested": [
        {
            name: "Make local component from selection",
            data: false,
        },
        {
            name: "Get instance swap props",
            data: true,
        },
    ]
};


(async () => {

    figma.parameters.on('input', async ({ parameters, key, query, result }: ParameterInputEvent) => {
        if(key == 'selectionData') {
            const suggestions = await readInstanceSwapProperties(figma.currentPage.selection as SceneNode[]);

            if(suggestions == null) {
                return result.setSuggestions([{
                    name: "No instance swap props found",
                    data: null
                }])
            }
            
            return result.setSuggestions(suggestions.map(record => {
                return {
                    name: `${record.propName} › ${record.instanceName}`,
                    data: record
                }
            }));
        }

        if (key) {
            result.setSuggestions(paramsSuggestions[key]);
        }
    });

    figma.on('run', async ({ command, parameters }: RunEvent) => {
        if (command == "bindToStyles") {
            bindVariablesAndStyles();
            figma.closePlugin();
        }

        if (command == "updateElevationComponents") {
            await updateElevationComponents();
            figma.closePlugin();
        }

        if (command == "setPlayground") {
            const isPlayground = figma.root.getPluginData('SDSPlayground') !== '';
            figma.root.setPluginData('SDSPlayground', isPlayground ? '' : 'true');
            figma.closePlugin(`${isPlayground ? '❎' : '✅'} Playground is ${isPlayground ? 'disabled' : 'enabled'}`);
        }

        if (command == "fixComponents") {
            await processComponents();
            figma.closePlugin();
        }
        if (command == "fixLayers") {
            const result = await processFrames();
            figma.closePlugin(`Updated ${result.updated}, skipped ${result.skipped} and failed ${result.failed}`);
        }

        if (command == "exportComponentTemplates") {
            await exportComponentTemplates();
            figma.closePlugin('Style templates exported');
        }
        
        if (command == "importStyleTemplates") {
            debugger;
            await importComponentTemplates(parameters.overwrite as boolean);
            figma.closePlugin('Style templates imported');
        }

        if (command == "cloneComponent") {
            await cloneNodes(figma.currentPage.selection);
            await delayAsync(100);
            figma.closePlugin('Component cloned');
        }
        if (command == "makeLocalComponent") {
            await instanceToLocalComponent(figma.currentPage.selection as SceneNode[]);
            await delayAsync(100);
            figma.closePlugin('Component cloned');
        }

        if (command == "getInstanceSwapProps") {
            console.log(parameters);

            if(parameters.selectionData == null) {
                figma.closePlugin('Select an instance with instance swap properties and try again');
            }
            else {
                const {
                    selectedNodeId, propName, instanceId
                } = parameters.selectionData;


                const selectedElement = figma.currentPage.selection.find(node => node.id === selectedNodeId);

                if(selectedElement.type == 'INSTANCE') {
                    const name = selectedElement.name;
                    const nestedInstances = selectedElement.findAllWithCriteria({types: ["INSTANCE"]});
                    const swapInstanceNode = nestedInstances.find(node => node.id == instanceId);
                 
                    if(swapInstanceNode) {
                        debugger;
                        await instanceToLocalComponent([swapInstanceNode]);
                        await delayAsync(100);
                        figma.closePlugin('Component cloned');
                    }

                }
            }

            figma.closePlugin('Nothing....');
        }        
    });
    
})()

