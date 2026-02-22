
import JSZip from 'jszip';

/**
 * Phân tích file EPUB và trích xuất toàn bộ nội dung văn bản.
 * Quy trình:
 * 1. Giải nén file.
 * 2. Tìm file OPF thông qua META-INF/container.xml.
 * 3. Đọc manifest và spine từ OPF để xác định thứ tự chương.
 * 4. Đọc từng file HTML/XHTML, loại bỏ thẻ tag và gộp văn bản.
 */
export const parseEpubFile = async (file: File): Promise<string> => {
    try {
        const zip = await JSZip.loadAsync(file);

        // 1. Tìm file .opf (Rootfile)
        const containerXml = await zip.file("META-INF/container.xml")?.async("string");
        if (!containerXml) throw new Error("Không tìm thấy META-INF/container.xml (File EPUB hỏng?)");

        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(containerXml, "application/xml");
        const rootfileNode = containerDoc.querySelector("rootfile");
        const opfPath = rootfileNode?.getAttribute("full-path");

        if (!opfPath) throw new Error("Không xác định được đường dẫn file OPF.");

        // 2. Đọc file .opf
        const opfContent = await zip.file(opfPath)?.async("string");
        if (!opfContent) throw new Error(`Không tìm thấy file OPF tại ${opfPath}`);

        const opfDoc = parser.parseFromString(opfContent, "application/xml");
        
        // Namespace cho EPUB 2.0 và 3.0
        const ns = "http://www.idpf.org/2007/opf";
        
        // 3. Lấy Manifest (Danh sách file) và Spine (Thứ tự đọc)
        // Lưu ý: getElementsByTagName có thể không cần namespace trong HTML parser, nhưng XML parser thì cần cẩn thận.
        const manifestItems = Array.from(opfDoc.getElementsByTagName("item"));
        const spineItems = Array.from(opfDoc.getElementsByTagName("itemref"));

        const idToHref: Record<string, string> = {};
        manifestItems.forEach(item => {
            const id = item.getAttribute("id");
            const href = item.getAttribute("href");
            if (id && href) idToHref[id] = href;
        });

        // Xác định đường dẫn tương đối của file OPF để resolve đường dẫn các file content
        // Ví dụ: opfPath = "OEBPS/content.opf" -> basePath = "OEBPS/"
        const lastSlashIndex = opfPath.lastIndexOf("/");
        const basePath = lastSlashIndex !== -1 ? opfPath.substring(0, lastSlashIndex + 1) : "";

        let fullText = "";

        // 4. Duyệt qua Spine để đọc nội dung theo đúng thứ tự
        for (const itemRef of spineItems) {
            const idref = itemRef.getAttribute("idref");
            if (!idref || !idToHref[idref]) continue;

            const href = idToHref[idref];
            // Resolve đường dẫn file
            const filePath = basePath + href;
            
            const fileData = await zip.file(filePath)?.async("string");
            if (fileData) {
                // Parse HTML để lấy text sạch
                const contentDoc = parser.parseFromString(fileData, "text/html"); // Dùng text/html để tolerant lỗi cú pháp hơn application/xhtml+xml
                
                // Loại bỏ các thẻ style, script để tránh rác
                contentDoc.querySelectorAll('script, style, head').forEach(e => e.remove());
                
                const textContent = contentDoc.body.textContent || "";
                
                // Gộp text, thêm xuống dòng giữa các chương
                fullText += textContent.trim() + "\n\n";
            }
        }

        return fullText.trim();

    } catch (e) {
        console.error("EPUB Parsing Error:", e);
        throw new Error(`Lỗi đọc file EPUB: ${e instanceof Error ? e.message : String(e)}`);
    }
};
