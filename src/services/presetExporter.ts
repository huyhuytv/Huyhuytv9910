import type { SillyTavernPreset } from '../types';

/**
 * Exports a SillyTavernPreset object to a JSON file and triggers a download.
 * @param preset The preset object to export.
 * @param fileName The name of the file to be downloaded.
 */
export const exportPresetToJson = (preset: SillyTavernPreset, fileName: string): void => {
    try {
        const presetToExport = JSON.parse(JSON.stringify(preset));

        // Remove the deprecated prompt_order field before exporting
        delete presetToExport.prompt_order;

        Object.keys(presetToExport).forEach(key => {
            if (presetToExport[key] === null || presetToExport[key] === undefined) {
                delete presetToExport[key];
            }
            if (Array.isArray(presetToExport[key]) && presetToExport[key].length === 0) {
                 if(key === 'stopping_strings' || key === 'custom_stopping_strings') {
                    delete presetToExport[key];
                 }
            }
        });
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(presetToExport, null, 2));
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (error) {
        console.error("Failed to export preset:", error);
        alert("An error occurred while trying to export the preset file.");
    }
};
