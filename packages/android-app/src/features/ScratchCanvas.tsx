import React, { useRef, useEffect } from "react";

const ScratchCanvas: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;

    if (!iframe) return;

    const listener = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      console.log("Scratch loaded", doc);
    };

    iframe.addEventListener("load", listener);

    return () => {
      iframe.removeEventListener("load", listener);
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src="/scratch.html"
      sandbox="allow-same-origin allow-scripts"
      className="h-svh w-auto mx-auto aspect-[4/3]"
    />
  );
};

export default ScratchCanvas;
