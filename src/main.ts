import { bindVariablesAndStyles } from './utils/variables-to-styles';
import { processComponents } from './fix-layers';
import { updateElevationComponents } from './update-elevation-components';
import { exportStyleTemplates } from './export-style-templates';
import { importStyleTemplates } from './import-style-templates';

console.clear();

(async () => {
    if (figma.command == "bindToStyles") {
        bindVariablesAndStyles();
        figma.closePlugin();
    }

    if (figma.command == "updateElevationComponents") {
        await updateElevationComponents();
        figma.closePlugin();
    }

    if (figma.command == "setPlayground") {
        const isPlayground = figma.root.getPluginData('SDSPlayground') !== '';
        figma.root.setPluginData('SDSPlayground', isPlayground ? '' : 'true');
        figma.closePlugin(`${isPlayground ? '❎' : '✅'} Playground is ${isPlayground ? 'disabled' : 'enabled'}`);
    }

    if (figma.command == "fixLayers") {
        await processComponents();
        figma.closePlugin();
    }

    if (figma.command == "exportStyleTemplates") {
        await exportStyleTemplates();
        figma.closePlugin('Style templates exported');
    }
    
    if (figma.command == "importStyleTemplates") {
        await importStyleTemplates();
        figma.closePlugin('Style templates imported');
    }
})()

