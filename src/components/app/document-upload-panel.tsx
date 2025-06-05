
"use client";

import type { UploadedFile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadCloud, XCircle, Paperclip } from 'lucide-react';
import * as React from 'react';
import { useToast } from '@/hooks/use-toast';

interface DocumentUploadPanelProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSizeMb?: number; // Max file size in MB
}

export function DocumentUploadPanel({ 
  files, 
  onFilesChange,
  maxFiles = 10,
  maxFileSizeMb = 10,
}: DocumentUploadPanelProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const { toast } = useToast();
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const handleFileProcessing = (fileList: FileList) => {
    const newFiles: UploadedFile[] = [...files];
    let acceptedCount = 0;

    Array.from(fileList).forEach(file => {
      if (newFiles.length >= maxFiles) {
        toast({ title: "File limit reached", description: `Maximum ${maxFiles} files allowed.`, variant: "destructive" });
        return;
      }
      if (file.size > maxFileSizeBytes) {
        toast({ title: "File too large", description: `${file.name} exceeds ${maxFileSizeMb}MB limit.`, variant: "destructive" });
        return;
      }
      if (newFiles.find(f => f.name === file.name && f.size === file.size)) {
        toast({ title: "Duplicate file", description: `${file.name} is already uploaded.`, variant: "default" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        newFiles.push({
          id: crypto.randomUUID(),
          file: file,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target?.result as string,
        });
        acceptedCount++;
        // Update state only after all files in the current batch are processed
        if(acceptedCount === fileList.length || newFiles.length === Array.from(fileList).filter(f => f.size <= maxFileSizeBytes).length) {
            onFilesChange([...newFiles]); // Create a new array reference
        }
      };
      reader.onerror = () => {
        toast({ title: "Error reading file", description: `Could not read ${file.name}.`, variant: "destructive" });
      }
      reader.readAsDataURL(file);
    });
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcessing(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcessing(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Document Upload</CardTitle>
        <CardDescription>Upload relevant case documents (PDF, DOCX, images).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer
            ${isDragging ? 'border-accent bg-accent/10' : 'border-input hover:border-accent/70'}
            transition-colors duration-200 ease-in-out`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className={`w-12 h-12 mb-3 ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG (MAX. {maxFileSizeMb}MB per file, {maxFiles} files total)</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,image/*"
            onChange={handleFileSelect}
          />
        </div>

        {files.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Uploaded Files:</h3>
            <ScrollArea className="h-40 w-full rounded-md border p-2 custom-scrollbar">
              <ul className="space-y-2">
                {files.map((uploadedFile) => (
                  <li key={uploadedFile.id} className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate" title={uploadedFile.name}>{uploadedFile.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFile(uploadedFile.id)} className="h-6 w-6">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
