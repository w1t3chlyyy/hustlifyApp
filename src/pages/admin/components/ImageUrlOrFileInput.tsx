import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/adminApi';
import { isImageValue } from '@/lib/isImageValue';

type ImageUrlOrFileInputProps = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  previewClassName?: string;
  showPreview?: boolean;
  inputClassName?: string;
};

/**
 * Field that lets the admin set an image either by pasting a URL or by
 * uploading a file (which is uploaded via adminApi.uploadFile and turned
 * into a URL automatically). Used everywhere in the admin panel an image
 * can be set, so the UX is consistent across products, cases, projects, etc.
 */
const ImageUrlOrFileInput = ({
  value,
  onChange,
  folder = 'misc',
  placeholder = 'https://... или загрузите файл',
  previewClassName = 'w-20 h-20',
  showPreview = true,
  inputClassName,
}: ImageUrlOrFileInputProps) => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const url = await adminApi.uploadFile(file, folder);
      onChange(url);
    } catch (e: any) {
      toast({ title: 'Не удалось загрузить файл', description: e?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          className={inputClassName}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="icon" className="shrink-0 relative" disabled={uploading}>
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f);
              e.target.value = '';
            }}
          />
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </Button>
      </div>
      {showPreview && isImageValue(value) && (
        <div className={`${previewClassName} rounded-lg overflow-hidden border border-border/50 bg-black`}>
          <img src={value} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
};

export default ImageUrlOrFileInput;
