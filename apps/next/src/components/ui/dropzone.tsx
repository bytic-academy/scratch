import React, { useRef } from "react";

import { cn } from "~/lib/utils";

type DropzoneProps = React.PropsWithChildren<{
  onChange: (file: File) => void;
  supportedFormats: string | string[];
  name?: string;
  disabled?: boolean;
  className?: string;
}>;

export const Dropzone: React.FC<DropzoneProps> = ({
  onChange,
  supportedFormats,
  disabled,
  name,
  className,
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => {
        inputRef.current?.click();
      }}
      className={cn(
        "hover:bg-accent flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-md border-3 border-dashed text-sm",
        className,
      )}
    >
      {children}

      <input
        ref={inputRef}
        disabled={disabled}
        name={name}
        type="file"
        onChange={(e) => {
          const file = e.target.files?.item(0);

          if (!file) return;

          onChange(file);
        }}
        accept={
          Array.isArray(supportedFormats)
            ? supportedFormats.join(",")
            : supportedFormats
        }
        hidden
      />
    </div>
  );
};
