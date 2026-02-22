

import React, { ErrorInfo } from 'react';
import { dispatchSystemLog } from '../services/logBridge';

interface GlobalErrorBoundaryProps {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends React.Component<GlobalErrorBoundaryProps, State> {
  // Fix: Explicitly declare props to resolve TS error
  declare props: Readonly<GlobalErrorBoundaryProps>;

  // Thêm 'readonly' để khớp với định nghĩa của React.Component và giải quyết lỗi strict mode.
  readonly state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
        // Ghi lại lỗi vào hệ thống log một cách an toàn
        dispatchSystemLog(
            'error',
            'system',
            `React Render Crash: ${error.message}`,
            errorInfo.componentStack
        );
    } catch (e) {
        // Dự phòng nếu hệ thống log gặp lỗi
        console.error("Không thể gửi log hệ thống từ ErrorBoundary", e);
    }
    
    // Luôn ghi lại lỗi vào console của trình duyệt để gỡ lỗi
    console.error("Uncaught error in React Tree:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 p-6">
          <div className="max-w-md w-full bg-slate-800 border border-red-500/50 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-xl font-bold">Hệ thống đã gặp sự cố</h2>
            </div>
            <p className="text-slate-400 mb-4 text-sm">
              Một lỗi nghiêm trọng đã xảy ra trong quá trình hiển thị giao diện. Lỗi này đã được ghi lại vào Bảng điều khiển Hệ thống.
            </p>
            <div className="bg-slate-950 p-3 rounded border border-slate-700 mb-6 overflow-auto max-h-32">
                <code className="text-xs font-mono text-red-300">
                    {this.state.error?.message || 'Unknown Error'}
                </code>
            </div>
            <button
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    // Fix: Accessing `this.props` on a class component instance.
    return this.props.children || null;
  }
}
