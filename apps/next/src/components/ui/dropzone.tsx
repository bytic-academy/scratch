import React, { useRef } from "react";
import { ImageIcon } from "lucide-react";
import { SupportedIconFormats, UpdateProjectIconSchema } from "~/server/schemas/project";

type DropzoneProps = {
  onChange: (file: File) => void;
  name?: string;
  disabled?: boolean;
};

export const Dropzone: React.FC<DropzoneProps> = ({
  onChange,
  disabled,
  name,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => {
        inputRef.current?.click();
      }}
      className="flex h-32 w-full cursor-pointer hover:bg-accent flex-col items-center justify-center gap-4 rounded-md border-3 border-dashed text-sm"
    >
      <ImageIcon className="size-8 stroke-1" />
      برای بارگزاری آیکون اینجا کلیک کن
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
        accept={SupportedIconFormats.join(",")}
        hidden
      />
    </div>
  );
};
