AI Courses (HTML + Tailwind + Firebase)

Hướng dẫn nhanh:

- Mở `index.html` bằng Live Server (hoặc một HTTP server tĩnh) để tránh lỗi CORS khi dùng ES Modules.
- Cấu hình Firebase đã được đưa vào `js/firebase.js` theo thông tin bạn cung cấp.
- Tài khoản admin: đặt thủ công bằng cách vào Firestore, chỉnh `users/{uid}` -> `role: "admin"` cho tài khoản của bạn sau khi đăng ký/lần đầu đăng nhập.

 Các trang:

- `index.html`: Trang chủ (giới thiệu, điều hướng vào ứng dụng).
- `app.html`: Ứng dụng người dùng (sidebar + router, dành cho user), admin có trang riêng `admin.html`.
- `login.html`: Đăng nhập/Quên mật khẩu (không còn đăng ký tự phục vụ; tài khoản do Admin tạo).
- `dashboard.html`: Khoá học đã ghi danh + tiến trình.
- `course.html?id=...`: Học từng bài, tick hoàn thành để lưu tiến trình.
- `admin.html`: Quản trị người dùng và khoá học (chỉ dành cho role `admin`).

 Cấu trúc Firestore:

- `users/{uid}`: { uid, email, role, enrolledCourseIds: string[], disabled, createdAt, updatedAt }
- `users/{uid}/progress/{courseId}`: { completedLessonIds: string[] }
- `courses/{courseId}`: { title, description, lessons: {id, title, content, videoUrl?, notes?, exercises?: string[], resources?: { title: string, url: string }[]}[] }

Ghi chú về quản trị:

- Thêm người dùng: Chỉ Admin được tạo tài khoản từ trang quản trị (sử dụng Firebase App thứ cấp để không ảnh hưởng phiên hiện tại). Tính năng đăng ký tự phục vụ của người dùng đã bị loại bỏ khỏi UI.

Security Rules mẫu (chỉ cho phép xem khoá học khi được cấp quyền):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }
    function isSelf(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read: if isSelf(uid) || isAdmin();
      allow create: if isSelf(uid);
      allow update: if isSelf(uid) || isAdmin();
      allow delete: if isAdmin();
    }

    match /users/{uid}/progress/{courseId} {
      allow read, write: if isSelf(uid) || isAdmin();
    }

    match /courses/{courseId} {
      allow read: if isAdmin() || (
        isSignedIn() && (courseId in (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.enrolledCourseIds || []))
      );
      allow create, update, delete: if isAdmin();
    }
  }
}
```

 Phần nội dung bài học (video, ghi chú, bài tập, tài liệu)

- Mở rộng cấu trúc mỗi bài học trong `courses/{courseId}.lessons[]` thành các trường:
  - `id: string` — ID bài học
  - `title: string` — tiêu đề
  - `videoUrl?: string` — link video (YouTube, v.v.). Hệ thống tự chuyển sang URL nhúng khi là YouTube
  - `content?: string` — nội dung bài học (mô tả dài)
  - `notes?: string` — ghi chú
  - `exercises?: string[]` — danh sách bài tập (mỗi phần tử là một mục)
  - `resources?: { title: string, url: string }[]` — danh sách tài liệu (tiêu đề + link)

- UI quản trị (admin) đã được cập nhật để điền các trường trên khi thêm bài học mới. 
  - "Bài tập": nhập nhiều mục, phân tách dấu phẩy hoặc xuống dòng.
  - "Tài liệu": thêm nhiều dòng bằng nút "+ Thêm tài liệu" (mỗi dòng gồm tiêu đề và link, có thể xoá dòng).
- Trang học (`course.html`) hiển thị:
  - Video nhúng nếu có `videoUrl`
  - Nội dung, ghi chú
  - Danh sách bài tập và tài liệu (tiêu đề + link, mở tab mới)

 Ví dụ một tài liệu khoá học với bài học mở rộng:

 ```json
 {
   "title": "Nhập môn AI",
   "description": "Tổng quan khóa học",
   "lessons": [
     {
       "id": "uuid-1",
       "title": "Giới thiệu",
       "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
       "content": "Nội dung dài...",
       "notes": "Ghi chú ngắn...",
       "exercises": ["Câu 1...", "Câu 2..."],
      "resources": [
        { "title": "Bài báo A", "url": "https://paper.example.com" },
        { "title": "Tài liệu B", "url": "https://docs.example.com" }
      ]
  }
  ]
}
```

Triển khai cục bộ:

- Dùng VS Code Live Server hoặc chạy `npx serve .` để mở http://localhost:3000 và thử nghiệm.

Lưu ý Tailwind:

- Sử dụng CDN `https://cdn.tailwindcss.com` để thuận tiện dev. Khi triển khai production nên build Tailwind để tối ưu CSS.

Hạn chế & lưu ý bảo mật:

- Quản trị xoá tài khoản Auth: Không thể thực hiện trực tiếp từ client SDK; cần Cloud Functions/Admin SDK. Trang admin hiện cho phép “xoá hồ sơ” Firestore và bật/tắt `disabled`.
- Tạo người dùng từ admin: App thứ cấp vẫn sử dụng Email/Password công khai. Hãy kết hợp với quy trình/kiểm soát nội bộ, hoặc chuyển sang cơ chế mời (email link) nếu cần.
- Hãy triển khai Security Rules nêu trên để chặn người dùng không phải admin sửa dữ liệu nhạy cảm.
