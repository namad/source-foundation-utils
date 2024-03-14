import { delayAsync } from "./utils/delay-async";

export async function updateElevationComponents() {

    let localEffectStyles = await figma.getLocalEffectStylesAsync();
    const effects = new Map<string, EffectStyle>;

    localEffectStyles = localEffectStyles.filter((effect: EffectStyle) => {
        const name = effect.name.split('/').at(0);

        if(effects.has(name)) {
            return false;
        }

        effects.set(name, effect);
        return true;

    });

    figma.skipInvisibleInstanceChildren = true;

    const pageComponents = figma.currentPage.findAllWithCriteria({ types: ['COMPONENT'] });

    const elevationComponents = pageComponents.filter(node => {
        const name = node.name.toLocaleLowerCase();
        return effects.has(name);
    });

    if (elevationComponents.length == 0) {
        return console.warn('No elevation components has been found');
    }
    else {
        for(const component of elevationComponents) {
            const effect = effects.get(component.name);

            if(effect) {
                await processComponent(effect, component);
            }
            else {
                console.warn(`Cannot find elevation component name ${component.name}`);
            }
        }
    }
}


async function processComponent(effect: EffectStyle, component: ComponentNode) {
    debugger
    const shadowLayers = component.findChildren(node => {
        const name = node.name.toLocaleLowerCase();
        return name.startsWith('shadow');
    }) as VectorNode[];

    const maskLayer = component.findChild(node => {
        return node.name.toLocaleLowerCase() === 'mask';
    }) as BooleanOperationNode;

    maskLayer.visible = false;

    debugger;

    effect.effects.forEach((effect, index) => {
        const shadowLayer = shadowLayers[index];

        if(effect.type != 'DROP_SHADOW') {
            return
        }

        const x = effect.offset.x;
        const y = effect.offset.y;
        const radius = effect.radius;
        const spread = effect.spread;


        const width = component.width + (2 * spread);
        const height = component.height + (2 * spread);
        const left = x - spread;
        const top = y - spread;

        const blur: BlurEffect = {
            type: "LAYER_BLUR",
            radius: radius,
            visible: true
        };

        shadowLayer.effects = [blur];
        shadowLayer.resize(width, height);
        shadowLayer.x = left;
        shadowLayer.y = top;
    });

    const absoluteBoundingBox = component.absoluteBoundingBox;
    const absoluteRenderBounds = component.absoluteRenderBounds;

    const maskWidth = absoluteRenderBounds.width;
    const maskHeight = absoluteRenderBounds.height;
    const maskLeft = (absoluteRenderBounds.x - absoluteBoundingBox.x);
    const maskTop = (absoluteRenderBounds.y - absoluteBoundingBox.y);

    const innerLayer = maskLayer.findChild(node => node.name === 'inner') as VectorNode;
    const outerLayer = maskLayer.findChild(node => node.name === 'outer') as VectorNode;

    outerLayer.resize(maskWidth, maskHeight);
    outerLayer.x = maskLeft;
    outerLayer.y = maskTop;

    innerLayer.resize(component.width, component.height);
    innerLayer.x = 0;
    innerLayer.y = 0;

    maskLayer.visible = true;

    await delayAsync(1);
}