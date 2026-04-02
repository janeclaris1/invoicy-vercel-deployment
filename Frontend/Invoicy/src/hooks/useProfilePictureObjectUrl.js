import { useState, useEffect, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../utils/apiPaths";

/**
 * Fetches the user's profile image with auth headers and exposes a blob: URL for <img src>.
 * Revokes the previous object URL on change/unmount.
 */
export function useProfilePictureObjectUrl(profilePicture) {
    const [objectUrl, setObjectUrl] = useState(null);
    const blobUrlRef = useRef(null);

    useEffect(() => {
        if (!profilePicture) {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
            setObjectUrl(null);
            return undefined;
        }

        let cancelled = false;
        const safeName = encodeURIComponent(profilePicture);
        const url = `${BASE_URL}${API_PATHS.AUTH.PROFILE_PICTURE(safeName)}`;

        axiosInstance
            .get(url, { responseType: "blob" })
            .then((res) => {
                if (cancelled) return;
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
                const next = URL.createObjectURL(res.data);
                blobUrlRef.current = next;
                setObjectUrl(next);
            })
            .catch(() => {
                if (!cancelled) setObjectUrl(null);
            });

        return () => {
            cancelled = true;
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = null;
            }
        };
    }, [profilePicture]);

    return objectUrl;
}
