
import type { RPGDatabase } from '../types/rpg';

/**
 * Cấu trúc RPG mặc định (Template: Tu Tiên/Huyền Huyễn)
 */
const NEW_DEFAULT_DB: RPGDatabase = {
  "version": 2,
  "tables": [
    {
      "config": {
        "id": "sheet_dCudvUnH",
        "name": "Dữ liệu chung",
        "description": "Ghi lại địa điểm hiện tại của nhân vật chính, các tham số môi trường và lời dẫn của Khí Linh. Bảng này chỉ có duy nhất một dòng.\n- Cột 0: Địa điểm hiện tại - Tên cụ thể của nơi nhân vật chính đang đứng.\n- Cột 1: Thời gian hiện tại - Định dạng: 'YYYY-MM-DD HH:MM'.\n- Cột 2: Thời gian trôi qua - Mô tả văn bản về khoảng thời gian đã trôi qua so với vòng trước.\n- Cột 3: Thời tiết hiện tại & Bầu không khí.\n- Cột 4: Nồng độ linh khí - Mô tả nồng độ linh khí tại khu vực (VD: Khô kiệt, Bình thường, Nồng đậm, Tiên gia phúc địa).\n- Cột 5: Mức độ nguy hiểm - Đánh giá độ nguy hiểm (VD: An toàn, Cảnh giác, Nguy hiểm, Tử vong).\n- Cột 6: Khí Linh (Fairy Messages) - Lời nhắn từ hệ thống/trợ lý ảo. Tính cách: Tinh nghịch, hay châm chọc (khi an toàn) nhưng rất quan tâm chủ nhân (khi nguy hiểm).",
        "columns": [
          {
            "id": "0",
            "label": "Địa điểm hiện tại",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Thời gian hiện tại",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Thời gian trôi qua",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Thời tiết hiện tại",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Nồng độ linh khí",
            "type": "string"
          },
          {
            "id": "5",
            "label": "Mức độ nguy hiểm",
            "type": "string"
          },
          {
            "id": "6",
            "label": "Khí Linh (Fairy Messages)",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "always",
          "splitByRow": true,
          "entryName": "Dữ liệu chung",
          "entryType": "constant",
          "keywords": "Dữ liệu chung",
          "injectIntoWorldbook": true
        },
        "aiRules": {
          "init": "Chèn một dòng ghi lại trạng thái thế giới hiện tại. Khởi tạo lời chào của Khí Linh với giọng điệu tinh nghịch.",
          "update": "Cập nhật địa điểm, nồng độ linh khí và mức độ nguy hiểm khi nhân vật di chuyển. Bắt buộc cập nhật thời gian sau mỗi vòng chat. Cập nhật lời của Khí Linh (Cột 6) phản ứng với tình huống hiện tại (",
          "insert": "Cấm thao tác.",
          "delete": "Cấm xóa."
        },
        "orderNo": 0
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_DpKcVGqg",
        "name": "Nhân vật chính ({user}}",
        "description": "Ghi lại thông tin cốt lõi và trạng thái  của ({user}}. Bảng này chỉ có và duy nhất một dòng.\n- Cột 0: Tên ({user}}.\n- Cột 1: Giới tính/Tuổi.\n- Cột 2: Ngoại hình & Trang phục - Mô tả đầu tóc, mắt, dáng người và trang phục đang mặc.\n- Cột 3: Thân phận & Nghề nghiệp - Vai trò xã hội hoặc chức vị trong tông môn/tổ chức.\n- Cột 4: Quá khứ/Kinh nghiệm - Cập nhật tích lũy sự kiện quan trọng (Tối đa 300 chữ).\n- Cột 5: Tính cách - Tóm tắt tính cách cốt lõi.\n- Cột 6: Cảnh giới & Tiến độ - Ghi rõ cảnh giới hiện tại kèm tỷ lệ phần trăm đột phá. Định dạng: 'Tên cảnh giới [XX%/100%]'.\n- Cột 7: Linh căn/Thể chất/Thiên phú - Ghi Tên kèm Mô tả chi tiết tác dụng/nguồn gốc. (VD: 'Hỏa Linh Căn: Tương thích tuyệt đối với pháp thuật hệ hỏa...').\n- Cột 8: Trạng thái hiện tại - Ghi rõ HP (Sức khỏe), MP (Năng lượng) và các Hiệu ứng (Buff/Debuff). Định dạng chuẩn: 'HP: XX% | MP: XX% | Trạng thái: [Tên hiệu ứng]... lưu ý nếu là thế giới bình thường hãy bỏ qua cột 6 cột 7 cột 8 , hãy xem xét đây là thế giới gì và điều chỉnh cho phù hợp",
        "columns": [
          {
            "id": "0",
            "label": "Tên ({user}}",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Giới tính/Tuổi",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Ngoại hình & Trang phục",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Thân phận & Nghề nghiệp",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Quá khứ/Kinh nghiệm",
            "type": "string"
          },
          {
            "id": "5",
            "label": "Tính cách",
            "type": "string"
          },
          {
            "id": "6",
            "label": "Cảnh giới & Tiến độ",
            "type": "string"
          },
          {
            "id": "7",
            "label": "Linh căn/Thể chất/Thiên phú",
            "type": "string"
          },
          {
            "id": "8",
            "label": "Trạng thái hiện tại",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "always",
          "splitByRow": true,
          "entryName": "Nhân vật chính ({user}}",
          "injectIntoWorldbook": true
        },
        "aiRules": {
          "init": "Khởi tạo thông tin nhân vật chính. Xác định rõ Linh căn/Thể chất ban đầu.",
          "update": "Cập nhật 'Quá khứ/Kinh nghiệm' theo diễn biến truyện. Cập nhật 'Cảnh giới' và tăng 'Tiến độ %' sau mỗi lần tu luyện. Cập nhật khi trạng thái nhân vật thay đổi. Cập nhật trang phục khi thay đồ.",
          "insert": "Cấm thao tác.",
          "delete": "Cấm xóa."
        },
        "orderNo": 1
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_NcBlYRH5",
        "name": "Nhân vật quan trọng",
        "description": "Ghi lại thông tin chi tiết và trạng thái động của các NPC quan trọng.\n\n【Quy tắc nhập liệu】\nNhập: [Nhân vật có tên, Liên quan cốt truyện, Tương tác nhiều lần]\nCấm: [Người qua đường, Quái vật vô tri]\n\n- Cột 0: Tên - Tên NPC.\n- Cột 1: Giới tính/Tuổi.\n- Cột 2: Ngoại hình & Trang phục - Mô tả đầu tóc, mắt, dáng người và trang phục đang mặc.\n- Cột 3: Tính cách - Tóm tắt tính cách cốt lõi.\n- Cột 4: Thân phận & Nghề nghiệp - Chức vị, vai trò xã hội.\n- Cột 5: Vị trí & Hành động hiện tại - Nơi đang đứng và việc đang làm NGAY LÚC NÀY.\n- Cột 6: Quan hệ/Hảo cảm - Mức độ thân thiết (VD: Bạn bè, Kẻ thù, Người yêu) và điểm số nếu có (0-100).\n- Cột 7: Thông tin đã biết về Main - **[Góc nhìn NPC]** Ghi lại những gì NPC này **đã biết** về nhân vật chính (ví dụ: biết tên thật, biết là gián điệp... **Tối đa 5 mục, chỉ giữ tin cốt lõi).\n- Cột 8: Thông tin chưa biết/Thắc mắc - **[Góc nhìn NPC]** Những gì NPC này đang tò mò hoặc hiểu lầm về nhân vật chính. **Tối đa 5 mục.**\n- Cột 9: Quá khứ/Kinh nghiệm - Tóm tắt background story (Tối đa 300 token).\n- Cột 10: Kỹ năng - Tên kỹ năng và mô tả ngắn. Tổng token không quá 100.\n- Cột 11: Vật phẩm quan trọng - Các món đồ key item NPC đang giữ, cách nhau bằng dấu chấm phẩy.\n- Cột 12: Cảnh giới & Tiến độ - Ghi rõ cảnh giới hiện tại kèm tỷ lệ phần trăm đột phá. Định dạng: 'Tên cảnh giới [XX%/100%]'.\n- Cột 13: Linh căn/Thể chất/Thiên phú - Ghi Tên kèm Mô tả chi tiết tác dụng/nguồn gốc. (VD: 'Hỏa Linh Căn: Tương thích tuyệt đối với pháp thuật hệ hỏa...').\n- Cột 14: Trạng thái hiện tại - Ghi rõ HP (Sức khỏe), MP (Năng lượng) và các Hiệu ứng (Buff/Debuff). Định dạng chuẩn: 'HP: XX% | MP: XX% | Trạng thái: [Tên hiệu ứng]...'\n- Cột 15: Suy nghĩ nội tâm - Đọc suy nghĩ/tâm tư thầm kín của NPC lúc này.\n\nLƯU Ý QUAN TRỌNG: Hãy kiểm tra bối cảnh thế giới hiện tại. Nếu là thế giới đời thường (không có tu tiên/ma pháp), hãy bỏ trống hoặc ghi 'N/A' cho Cột 12 và Cột 13.",
        "columns": [
          {
            "id": "0",
            "label": "Tên",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Giới tính/Tuổi",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Ngoại hình & Trang phục",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Tính cách",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Thân phận & Nghề nghiệp",
            "type": "string"
          },
          {
            "id": "5",
            "label": "Vị trí & Hành động hiện tại",
            "type": "string"
          },
          {
            "id": "6",
            "label": "Quan hệ & Hảo cảm",
            "type": "string"
          },
          {
            "id": "7",
            "label": "Thông tin đã biết về Main",
            "type": "string"
          },
          {
            "id": "8",
            "label": "Thông tin chưa biết/Thắc mắc",
            "type": "string"
          },
          {
            "id": "9",
            "label": "Quá khứ/Kinh nghiệm",
            "type": "string"
          },
          {
            "id": "10",
            "label": "Kỹ năng",
            "type": "string"
          },
          {
            "id": "11",
            "label": "Vật phẩm quan trọng",
            "type": "string"
          },
          {
            "id": "12",
            "label": "Cảnh giới & Tiến độ",
            "type": "string"
          },
          {
            "id": "13",
            "label": "Linh căn/Thể chất/Thiên phú",
            "type": "string"
          },
          {
            "id": "14",
            "label": "Trạng thái hiện tại",
            "type": "string"
          },
          {
            "id": "15",
            "label": "Suy nghĩ nội tâm",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "on_change",
          "splitByRow": true,
          "entryName": "Nhân vật quan trọng",
          "entryType": "keyword",
          "keywords": "Tên",
          "preventRecursion": true,
          "injectIntoWorldbook": true
        },
        "aiRules": {
          "init": "Khi khởi tạo, thêm dòng cho các nhân vật quan trọng đang có mặt. Xác định rõ quan hệ và hảo cảm ban đầu tại cột 6.",
          "update": "Cập nhật 'Vị trí & Hành động' (Cột 5), 'Trạng thái' (Cột 14) và 'Suy nghĩ nội tâm' (Cột 15) liên tục theo diễn biến. Cập nhật cột 6 khi quan hệ thay đổi hoặc chuyển biến. Khi NPC biết thêm bí mật hoặc có thắc mắc mới về Main, cập nhật Cột 7 và 8. Cột 9 cập nhật tích lũy, giữ tổng token dưới 300. Cập nhật cột 12 khi cảnh giới hoặc sức mạnh thay đổi (tăng lên hoặc giảm xuống hoặc biến mất).",
          "insert": "Thêm mới khi nhân vật quan trọng chưa từng xuất hiện bước vào cốt truyện.",
          "delete": "Chỉ xóa khi nhân vật hoàn toàn biến mất khỏi cốt truyện hoặc chết (Ghi chú 'Đã chết' trước khi xóa nếu cần lưu xác)."
        },
        "orderNo": 2,
        "lorebookLink": {
          "enabled": false,
          "keyColumnId": "0"
        }
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_lEARaBa8",
        "name": "Kỹ năng nhân vật",
        "description": "Ghi lại tất cả các kỹ năng/chiêu thức nhân vật chính đã học.\n\n【Ràng buộc】\n- Tên kỹ năng trùng nhau chỉ được tồn tại một dòng.\n- Khi nâng cấp kỹ năng thì cập nhật dòng hiện có.\n\n【Định dạng trường dữ liệu】\n- Tên kỹ năng: Ngắn gọn, súc tích.\n- Loại kỹ năng: [Chủ động, Bị động, Thiên phú, v.v.]\n- Phẩm chất: Phẩm chất của kỹ năng\n- Cấp độ/Giai đoạn: Độ thông thạo của kỹ năng hiện tại kèm tỷ lệ phần trăm. (VD: Sơ Nhập [10%], Tiểu Thành [45%],\n- Mô tả: Tác dụng cụ thể ở cấp độ hiện tại.",
        "columns": [
          {
            "id": "0",
            "label": "Tên kỹ năng",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Loại kỹ năng",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Phẩm chất",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Cấp độ/Giai đoạn",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Mô tả",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "always",
          "entryName": "Kỹ năng nhân vật"
        },
        "aiRules": {
          "init": "Khởi tạo các kỹ năng ban đầu của nhân vật theo thiết lập.",
          "update": "Điều kiện kích hoạt: ① Kỹ năng thăng cấp. ② Hiệu ứng thay đổi. ③ Phẩm chất thay đổi.",
          "insert": "Thêm dòng mới khi nhân vật học được kỹ năng mới.",
          "delete": "Xóa khi kỹ năng bị tước bỏ hoặc thay thế theo cốt truyện."
        },
        "orderNo": 4
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_in05z9vz",
        "name": "Túi đồ",
        "description": "Ghi lại các vật phẩm, trang bị trong hành trang nhân vật chính.",
        "columns": [
          {
            "id": "0",
            "label": "Tên vật phẩm",
            "type": "string",
            "description": ""
          },
          {
            "id": "1",
            "label": "Số lượng",
            "type": "string",
            "description": ""
          },
          {
            "id": "2",
            "label": "Mô tả/Hiệu ứng",
            "type": "string",
            "description": ""
          },
          {
            "id": "3",
            "label": "Loại",
            "type": "string",
            "description": ""
          }
        ],
        "export": {
          "enabled": false,
          "format": "markdown_table",
          "strategy": "always",
          "entryName": "Túi đồ",
          "entryType": "constant",
          "preventRecursion": true
        },
        "aiRules": {
          "update": "Cập nhật số lượng khi nhặt thêm hoặc sử dụng bớt, cập nhật trạng thái vật phẩm.",
          "insert": "Thêm dòng mới khi nhận được vật phẩm chưa từng có trong túi.",
          "delete": "Xóa khi vật phẩm bị dùng hết, vứt bỏ hoặc bị phá hủy.",
          "init": "Khởi tạo các vật phẩm ban đầu theo cốt truyện."
        },
        "orderNo": 4
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_etak47Ve",
        "name": "Nhiệm vụ và Sự kiện",
        "description": "Ghi lại tất cả các nhiệm vụ đang thực hiện.\n- Cột 0: Tên nhiệm vụ - Tiêu đề nhiệm vụ.\n- Cột 1: Loại nhiệm vụ - 'Nhiệm vụ chính' hoặc 'Nhiệm vụ phụ'.\n- Cột 2: Người giao - Nhân vật hoặc thế lực giao nhiệm vụ.\n- Cột 3: Mô tả chi tiết - Mục tiêu và yêu cầu nhiệm vụ.\n- Cột 4: Tiến độ hiện tại - Mô tả ngắn gọn mức độ hoàn thành.\n- Cột 5: Thời hạn - Thời gian còn lại để hoàn thành.\n- Cột 6: Phần thưởng - Thứ nhận được khi hoàn thành.\n- Cột 7: Hình phạt - Hậu quả nếu thất bại.",
        "columns": [
          {
            "id": "0",
            "label": "Tên nhiệm vụ",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Loại nhiệm vụ",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Người giao",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Mô tả chi tiết",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Tiến độ hiện tại",
            "type": "string"
          },
          {
            "id": "5",
            "label": "Thời hạn",
            "type": "string"
          },
          {
            "id": "6",
            "label": "Phần thưởng",
            "type": "string"
          },
          {
            "id": "7",
            "label": "Hình phạt",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "on_change",
          "splitByRow": true,
          "entryName": "Nhiệm vụ và Sự kiện",
          "entryType": "keyword",
          "keywords": "Tên nhiệm vụ",
          "injectIntoWorldbook": true
        },
        "aiRules": {
          "init": "Khi khởi tạo, thêm một dòng nhiệm vụ chính theo cốt truyện.",
          "update": "Cập nhật khi có tiến triển quan trọng.",
          "insert": "Thêm mới khi nhận hoặc kích hoạt nhiệm vụ mới.",
          "delete": "Xóa khi nhiệm vụ hoàn thành, thất bại hoặc hết hạn."
        },
        "orderNo": 5,
        "lorebookLink": {
          "enabled": false,
          "keyColumnId": "0"
        }
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_az6abs3bi",
        "name": "Các thế lực",
        "description": "Ghi lại thông tin các tổ chức, tông môn, bang phái, tập đoàn hoặc phe phái.\n- Cột 0: Tên thế lực.\n- Cột 1: Quy mô - Phân loại và Quy mô (VD: Nhất Phẩm Tông Môn, Tập đoàn đa quốc gia, Guild hạng S, Tổ chức khủng bố).\n- Cột 2: Lãnh đạo - Người đứng đầu hiện tại (Tông chủ, CEO, Bang chủ).\n- Cột 3: Mục đích - Mục đích hoạt động hoặc Tôn chỉ (VD: \"Bảo vệ nhân loại\", \"Hồi sinh Ma thần\", \"Kiếm tiền\").\n- Cột 4: Quan hệ - Mối quan hệ với nhân vật chính và các thế lực khác (VD: Đồng minh, Kẻ thù truyền kiếp, Trung lập, Đối tác làm ăn).\n- Cột 5: Vị trí - Căn cứ địa chính hoặc phạm vi hoạt động.\n- Cột 6: Trạng thái (VD: Đang hưng thịnh, Đang nội chiến, Đã bị tiêu diệt, Đang ẩn mình).\n- Cột 7: Mô tả - mô tả Bản chất, cấu trúc.",
        "columns": [
          {
            "id": "0",
            "label": "Tên thế lực",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Quy mô",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Lãnh đạo",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Mục đích",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Quan hệ",
            "type": "string"
          },
          {
            "id": "5",
            "label": "Vị trí",
            "type": "string"
          },
          {
            "id": "6",
            "label": "Trạng thái",
            "type": "string"
          },
          {
            "id": "7",
            "label": "Mô tả",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "on_change",
          "splitByRow": true,
          "entryName": "Thế lực",
          "entryType": "keyword",
          "keywords": "Tên thế lực",
          "preventRecursion": true,
          "injectIntoWorldbook": true
        },
        "aiRules": {
          "init": "Khởi tạo các thế lực đã biết.",
          "update": "Cập nhật khi thông tin về lãnh đạo, quan hệ hoặc địa bàn thay đổi.",
          "insert": "Thêm dòng mới khi nhân vật chính tiếp xúc hoặc nghe nói đến một thế lực mới có ảnh hưởng đến cốt truyện.",
          "delete": "Xóa khi thế lực bị tiêu diệt hoặc tan rã."
        },
        "orderNo": 11,
        "lorebookLink": {
          "enabled": true,
          "keyColumnId": "0"
        }
      },
      "data": {
        "rows": []
      }
    },
    {
      "config": {
        "id": "sheet_7fjmgmnsy",
        "name": "Địa điểm",
        "description": "Ghi lại thông tin các địa danh, địa đểm, bản đồ hoặc không gian nhân vật đã đặt chân đến hoặc nghe danh.\n- Cột 0: Tên địa điểm.\n- Cột 1: Loại hình (VD: Thành trì, Bí cảnh, Tông môn, Hành tinh) và Cấp bậc (nếu có).\n- Cột 2: Mô tả - Mô tả cảnh quan, kiến trúc, môi trường và chức năng.\n- Cột 3: Thế lực - Thế lực đang kiểm soát hoặc cai quản nơi này (VD: Triều đình, Ma tộc, A.I.M.S).\n- Cột 4: Độ nguy hiểm - Đánh giá độ nguy hiểm (VD: Khu an toàn, Cấm địa, Hazard Level 5).\n- Cột 5: Tài nguyên - Các tài nguyên, kho báu hoặc quái vật đặc hữu có thể tìm thấy ở đây.\n- Cột 6: Tình trạng gần đây - Sự kiện hoặc thay đổi đặc biệt tại nơi này (VD: Đang bị phong tỏa, Đã trở thành phế tích, Đang tổ chức lễ hội).",
        "columns": [
          {
            "id": "0",
            "label": "Tên địa điểm",
            "type": "string"
          },
          {
            "id": "1",
            "label": "Loại hình",
            "type": "string"
          },
          {
            "id": "2",
            "label": "Mô tả",
            "type": "string"
          },
          {
            "id": "3",
            "label": "Thế lực",
            "type": "string"
          },
          {
            "id": "4",
            "label": "Độ nguy hiểm",
            "type": "string"
          },
          {
            "id": "5",
            "label": "Tài nguyên",
            "type": "string"
          },
          {
            "id": "6",
            "label": "Tình trạng gần đây",
            "type": "string"
          }
        ],
        "export": {
          "enabled": true,
          "format": "markdown_table",
          "strategy": "on_change",
          "splitByRow": true,
          "entryName": "Địa điểm",
          "entryType": "keyword",
          "keywords": "Tên địa điểm",
          "preventRecursion": true,
          "injectIntoWorldbook": true
        },
        "aiRules": {
          "init": "Khởi tạo địa điểm hiện tại và các nơi quan trọng đã biết.",
          "update": "Cập nhật chi tiết mô tả khi nhân vật khám phá sâu hơn, phát hiện ra bí mật, lối đi ẩn hoặc quái vật mới. Cập nhật tình trạng, mức độ nguy hiểm và thế lực quản lý khi địa điểm xảy ra biến động lớn (như bị chiến tranh tàn phá, đổi chủ, phong tỏa hoặc tài nguyên bị khai thác cạn kiệt).",
          "insert": "Thêm mới khi nhân vật chính đến hoặc biết về một địa điểm quan trọng mới.",
          "delete": "Xóa khi địa điểm bị hủy diệt hoàn toàn hoặc biến mất."
        },
        "orderNo": 12,
        "lorebookLink": {
          "enabled": true,
          "keyColumnId": "0"
        }
      },
      "data": {
        "rows": []
      }
    }
  ],
  "globalRules": "Hệ thống RPG Tự động.",
  "settings": {
    "triggerMode": "auto",
    "executionMode": "integrated",
    "modelId": "",
    "customSystemPrompt": "\nBạn là một Medusa chuyên điền bảng biểu. Bạn cần tham khảo bối cảnh thiết lập trước đó cũng như <Dữ liệu chính văn> được gửi cho bạn để ghi lại dưới dạng bảng. \n\nBạn cần:\n1. Đọc <Cấu trúc bảng & Luật lệ> để hiểu ý nghĩa các cột và quy tắc cập nhật.\n2. Đọc <Dữ liệu bảng hiện tại> để biết trạng thái hiện tại.\n3. Tham khảo <Dữ liệu tham khảo> (nếu có) để hiểu các quy tắc thế giới, vật phẩm và chỉ số.\n4. Thực hiện sửa đổi (Thêm/Sửa/Xóa) để phản ánh diễn biến mới nhất.\n\nĐầu ra cuối cùng của bạn phải là định dạng văn bản thuần túy, tuân thủ nghiêm ngặt thứ tự <tableThink>, <tableCheck>, <tableEdit>. Bắt đầu trực tiếp bằng thẻ <tableThink> và kết thúc bằng thẻ </tableEdit>. Hướng dẫn điền cụ thể như sau:\n\n## 《Hướng dẫn điền bảng dữ liệu》\n\n<tableThink> (Khối suy nghĩ về bảng):\nChức năng: Chứa nội dung phân tích của AI, quá trình suy nghĩ để quyết định thao tác bảng. Mọi nội dung suy nghĩ phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.\n\nTóm tắt cốt truyện: Trước tiên, phải viết một bản tóm tắt cốt truyện hoàn chỉnh dựa trên dữ liệu chính văn do người dùng cung cấp. Lưu ý đặc biệt là người dùng có thể gửi nhiều lượt đối thoại, tóm tắt phải bao quát tất cả cốt truyện chính văn.\n\nNội dung tóm tắt: Mô tả đơn giản và đầy đủ toàn bộ cốt truyện diễn ra trong chính văn, bao gồm các thông tin có sự thay đổi.\n\nNắm bắt thay đổi: Tập trung vào trôi qua của thời gian, chuyển dịch địa điểm, thay đổi trạng thái/trải nghiệm/quan hệ của nhân vật, thu thập/tiêu hao vật phẩm, cập nhật tiến độ nhiệm vụ, v.v.\n\nÁnh xạ chỉ mục bảng (Bước then chốt): Đọc kỹ <Cấu trúc bảng & Luật lệ> và <Dữ liệu bảng hiện tại>. Tiêu đề của mỗi bảng sẽ ghi rõ chỉ mục và tên của nó, định dạng là [Index:TableName].\n\nTrích xuất chỉ mục thực: Bạn phải trích xuất trực tiếp con số trong ngoặc vuông làm tableIndex của bảng đó.\n\nNghiêm cấm đánh số lại: Tuyệt đối cấm bỏ qua chỉ mục trong tiêu đề và tự đếm bắt đầu từ 0! Nếu tiêu đề là [10:Bảng tóm tắt], thì chỉ mục của nó là 10, chứ không phải 0.\n\nDanh sách ánh xạ: Phải liệt kê từng bảng tồn tại trong dữ liệu hiện tại và chỉ mục thực đã trích xuất được. Định dạng: [Chỉ mục thực] Tên bảng.\n\nQuyết định thao tác: Sau khi hoàn thành tóm tắt và ánh xạ chỉ mục, dựa vào [Điều kiện kích hoạt Thêm/Xóa/Sửa] và [Mô tả cột] được định nghĩa trong <Cấu trúc bảng>, phân tích từng bảng xem cần thực hiện thao tác insertRow, updateRow, deleteRow nào.\n\nChỉ rõ tên bảng cần thao tác và tìm chỉ mục thực tương ứng dựa trên ánh xạ ở bước 2.\n\n<tableCheck> (Khối kiểm tra các mục quan trọng):\nChức năng: Sau khi suy nghĩ chính, trước khi thực hiện lệnh, tiến hành kiểm tra cuối cùng các nhiệm vụ quan trọng. Mọi nội dung kiểm tra phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.\n\nXác nhận khởi tạo: Kiểm tra dữ liệu hiện tại của tất cả các bảng trong <Dữ liệu bảng hiện tại> xem có hiển thị \"(Trống - Cần khởi tạo)\" hay không. Nếu có và luật cho phép khởi tạo, hãy dùng lệnh insertRow.\n\nXác nhận định vị bảng (Fixed Check): Xác nhận tất cả tên bảng bạn dự định cập nhật thực sự tồn tại trong \"Ánh xạ chỉ mục bảng\". Nếu không tồn tại, cấm thao tác bảng đó.\n\nĐối chiếu tham số chỉ mục (Fixed Check): Kiểm tra từng lệnh dự định tạo ra, xác nhận tham số tableIndex của nó hoàn toàn khớp với chỉ mục thực đã trích xuất.\n\nKiểm tra quy tắc mẫu: Thực hiện nghiêm ngặt các quy tắc [Kiểm tra] được định nghĩa trong mẫu bảng (như: kiểm tra tính duy nhất, kiểm tra định dạng, kiểm tra tính nhất quán, v.v.).\n\nTính nhất quán logic: Đảm bảo dữ liệu liên quan giữa các bảng khác nhau giữ được sự nhất quán về logic.\n\nĐối chiếu số thứ tự cột và hàng: Phải đối chiếu xem số thứ tự cột (dựa trên Schema) và hàng (dựa trên Data) được điền có thỏa mãn vị trí tương ứng hay không.\n\n<tableEdit> (Khối lệnh chỉnh sửa bảng):\nChức năng: Chứa các lệnh thao tác thực tế để cập nhật dữ liệu bảng (insertRow, updateRow, deleteRow). Mọi lệnh phải được bao gồm hoàn toàn trong khối chú thích <!-- và -->.\n\nYêu cầu bắt buộc về định dạng đầu ra:\n\nĐầu ra văn bản thuần túy: Nghiêm ngặt tuân theo thứ tự <tableThink>, <tableCheck>, <tableEdit>.\n\nCấm đóng gói: Nghiêm cấm sử dụng khối mã markdown, dấu ngoặc kép để bao gói toàn bộ đầu ra.\n\nKhông ký tự thừa: Ngoài bản thân các lệnh, cấm thêm bất kỳ văn bản giải thích nào.\n\nCú pháp lệnh <tableEdit> (Tuân thủ nghiêm ngặt):\n\nLoại thao tác: Chỉ giới hạn deleteRow, insertRow, updateRow.\n\nĐịnh dạng tham số:\n\ntableIndex (Số thứ tự bảng): Phải sử dụng chỉ mục thực bạn trích xuất từ tiêu đề [Index:Name] trong bước ánh xạ.\n\nrowIndex (Số thứ tự hàng): Tương ứng với chỉ số hàng trong <Dữ liệu bảng hiện tại> (số, bắt đầu từ 0).\n\ncolIndex (Số thứ tự cột): Phải là chuỗi ký tự trong dấu ngoặc kép (như \"0\", \"1\") tương ứng với thứ tự cột trong <Cấu trúc bảng>.\n\nVí dụ lệnh:\n\nChèn: insertRow(10, {\"0\": \"Dữ liệu 1\", \"1\": 100}) (Lưu ý: Nếu tiêu đề là [10:xxx], ở đây phải là 10)\n\nCập nhật: updateRow(0, 0, {\"2\": \"Trạng thái mới\", \"3\": true})\n\nXóa: deleteRow(2, 5)\n\n-- CONTEXT --\n<Cấu trúc bảng & Luật lệ>\n{{rpg_schema}}\n</Cấu trúc bảng & Luật lệ>\n\n<Dữ liệu tham khảo (Lorebook)>\n{{rpg_lorebook}}\n</Dữ liệu tham khảo (Lorebook)>\n\n<Dữ liệu bảng hiện tại>\n{{rpg_data}}\n</Dữ liệu bảng hiện tại>\n\n<Dữ liệu chính văn>\n{{chat_history}}\n</Dữ liệu chính văn>\n\nLUẬT CHUNG:\n{{global_rules}}\n",
    "triggerKeywords": [],
    "pinnedLorebookUids": []
  }
};

/**
 * Chuyển đổi RAW JSON thành RPGDatabase V2 (Optimized)
 * Hàm này được gọi khi tạo mới RPG Database (Kích hoạt Mythic Engine hoặc Reset Template).
 */
export const getTemplateVH = (): RPGDatabase => {
    // Trả về bản sao sâu (deep copy) để tránh tham chiếu biến toàn cục
    return {
        ...JSON.parse(JSON.stringify(NEW_DEFAULT_DB)),
        lastUpdated: Date.now()
    };
};
