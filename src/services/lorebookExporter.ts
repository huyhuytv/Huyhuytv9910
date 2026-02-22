import type { Lorebook } from '../types';

/**
 * Exports a Lorebook object to a JSON file and triggers a download.
 * The exported JSON will contain the 'book' property of the lorebook.
 * @param lorebook The lorebook object to export.
 * @param fileName The name of the file to be downloaded.
 */
export const exportLorebookToJson = (lorebook: Lorebook, fileName: string): void => {
    try {
        // We typically export just the book content, not the app-specific wrapper
        const dataToExport = lorebook.book;
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
        
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    } catch (error) {
        console.error("Failed to export lorebook:", error);
        alert("An error occurred while trying to export the lorebook file.");
    }
};
