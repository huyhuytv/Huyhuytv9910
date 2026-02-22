import { useState, useEffect } from 'react';
// @ts-ignore
import JSON5 from 'json5';

/**
 * Parses JSON with support for comments, trailing commas, and unquoted keys.
 * Falls back to standard JSON.parse if JSON5 fails.
 */
export function parseLooseJson(text: string): any {
    try {
        return JSON5.parse(text);
    } catch (e) {
        console.warn("JSON5 parse failed, falling back to JSON.parse", e);
        return JSON.parse(text);
    }
}

export function truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

const intervals = [
    { label: 'năm', seconds: 31536000 },
    { label: 'tháng', seconds: 2592000 },
    { label: 'tuần', seconds: 604800 },
    { label: 'ngày', seconds: 86400 },
    { label: 'giờ', seconds: 3600 },
    { label: 'phút', seconds: 60 },
    { label: 'giây', seconds: 1 }
];

export function useTimeAgo(timestamp: number) {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        const calculateTimeAgo = () => {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 5) return 'vừa xong';

            for (const interval of intervals) {
                const count = Math.floor(seconds / interval.seconds);
                if (count >= 1) {
                    return `${count} ${interval.label} trước`;
                }
            }
            return 'vừa xong';
        };

        setTimeAgo(calculateTimeAgo());

        // Update every minute
        const intervalId = setInterval(() => {
            setTimeAgo(calculateTimeAgo());
        }, 60000);

        return () => clearInterval(intervalId);
    }, [timestamp]);

    return timeAgo;
}