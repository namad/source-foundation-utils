Bunch of utilities for Source Design System and Source Foundation plugin. I feel like these automations can be useful for everyone who designs in Figma.

This is a UI-less plugin that uses Figma quick actions to run automations.

*Export Component Templates*
Select components or frames with components and run the command to copy all these components as frames. You can use these copies to import component templates back.


*Import Component Templates*
Select a frame with exported component templates and run the command. This command will either replace target component content with the contents of the template or it will merge layers


*Fix layers*
Sometimes Figma does not resize absolutely positioned layers when you update something rapidly. When you spot such rouge layers went off you can fix them with this automation.

This command finds all absolutely positioned layers inside auto layout frames and snaps their size back to fit the parent.


*Fix Component Layers*
Works the same as Fix Layers, but only on Components. When you have a component where absolutely positioned layers don’t behave use this automation to fix them.


*Create Color Styles*
This command will create colour styles that are bound to the variables of the same name.


*Clone Component*
Effortlessly clone any component or component set. When you copy/paste a simple component with lots of properties Figma creates a component instance. This automation creates an identical copy with all the properties available.


*Make Local Component*
Simplify workflow for slot components. This automation takes the instance inside another component, creates a local copy of that instance, makes it a component and swaps it with that component.


*Update Elevation Components*
This is Source Design System specific automation. It reads effect styles and updates custom-made elevation components to match effect shadows.


*Set Playground*
Mark any file as Source Foundation Playground. This plugin uses figma.root.setPluginData method from plugin API to toggle 'SDSPlayground' property.
