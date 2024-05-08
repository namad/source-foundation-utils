import { bindVariablesAndStyles } from './utils/variables-to-styles';
import { processComponents, processFrames } from './fix-layers';
import { updateElevationComponents } from './update-elevation-components';
import { exportComponentTemplates } from './export-component-templates';
import { importComponentTemplates } from './import-component-templates';
import { cloneNodes, instanceToLocalComponent } from './clone-component';
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
    ]
};


(async () => {

    figma.parameters.on('input', ({ parameters, key, query, result }: ParameterInputEvent) => {
        if (key) {
            result.setSuggestions(paramsSuggestions[key]);
        }
        else {
            result;
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
            const framesCount = await processFrames();
            figma.closePlugin(framesCount ? `Fixed ${framesCount} layer(s)` : `Select at least one layer and try again`);
        }

        if (command == "exportComponentTemplates") {
            await exportComponentTemplates();
            figma.closePlugin('Style templates exported');
        }
        
        if (command == "importStyleTemplates") {
            await importComponentTemplates(parameters.overwrite as boolean);
            figma.closePlugin('Style templates imported');
        }

        if (command == "cloneComponent") {
            await cloneNodes(figma.currentPage.selection);
            await delayAsync(100);
            figma.closePlugin('Component cloned');
        }
        if (command == "makeLocalComponent") {
            await instanceToLocalComponent(figma.currentPage.selection);
            await delayAsync(100);
            figma.closePlugin('Component cloned');
        }
    });
    
})()

