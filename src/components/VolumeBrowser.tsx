import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Folder, FileText, ChevronRight, Loader2, HardDrive, Check, Upload } from 'lucide-react';
import { useVolumes, useVolumeFiles } from '@/hooks/useK8s';
import { k8sApi } from '@/api/k8s';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
// types used via useVolumeFiles hook

interface VolumeBrowserProps {
  namespace: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (volumeName: string, filePath: string) => void;
}

export function VolumeBrowser({ namespace, open, onOpenChange, onSelect }: VolumeBrowserProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: volumeList, isLoading: volumesLoading } = useVolumes(namespace);
  const volumes = volumeList?.items ?? [];

  const [selectedVolume, setSelectedVolume] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadingName, setUploadingName] = useState('');

  const { data: listing, isLoading: filesLoading } = useVolumeFiles(
    namespace,
    selectedVolume,
    currentPath,
  );
  const entries = listing?.entries ?? [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file || !selectedVolume) return;

    setUploadError('');
    setUploading(true);
    setUploadProgress(0);
    setUploadingName(file.name);
    try {
      await k8sApi.uploadVolumeFile(
        namespace,
        selectedVolume,
        currentPath,
        file,
        setUploadProgress,
      );
      // 현재 경로 목록을 갱신하여 방금 올린 파일이 보이도록 한다.
      await queryClient.invalidateQueries({
        queryKey: ['volumes', namespace, selectedVolume, 'browse', currentPath],
      });
      // 업로드한 파일을 바로 선택 상태로 둔다 → "업로드 후 바로 COPY" 흐름.
      const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      setSelectedFile(fullPath);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('volume.uploadFailed'));
    } finally {
      setUploading(false);
      setUploadingName('');
    }
  };

  const dirs = entries.filter((e) => e.type === 'DIRECTORY');
  const files = entries.filter((e) => e.type === 'FILE');

  const handleSelectVolume = (name: string) => {
    setSelectedVolume(name);
    setCurrentPath('/');
    setSelectedFile('');
    setUploadError('');
  };

  const handleNavigate = (dirName: string) => {
    const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
    setCurrentPath(newPath);
    setSelectedFile('');
  };

  // 파일이든 디렉토리든 동일하게 "소스로 선택"한다. (COPY 는 디렉토리도 지원)
  const handleSelectEntry = (name: string) => {
    const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    setSelectedFile(fullPath);
  };

  const handleConfirm = () => {
    if (selectedVolume && selectedFile) {
      onSelect(selectedVolume, selectedFile);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedVolume('');
    setCurrentPath('/');
    setSelectedFile('');
    setUploadError('');
    setUploadProgress(0);
    setUploadingName('');
    onOpenChange(false);
  };

  // breadcrumb segments
  const pathSegments = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            {t('volume.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Selected path preview */}
        {selectedFile && (
          <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2 font-mono truncate">
            Volume: {selectedVolume} &rarr; {selectedFile}
          </div>
        )}

        {/* 2-Column Layout: Volume List + File Browser */}
        <div className="flex border border-border rounded-lg overflow-hidden h-[400px]">
          {/* Left: Volume List */}
          <div className="w-48 shrink-0 border-r border-border flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-muted shrink-0">
              <span className="text-xs font-medium text-muted-foreground">Volume</span>
            </div>
            <ul className="flex-1 overflow-auto">
              {volumesLoading ? (
                <li className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </li>
              ) : volumes.length === 0 ? (
                <li className="flex items-center justify-center py-10 text-xs text-muted-foreground/70">
                  {t('volume.empty')}
                </li>
              ) : (
                volumes.map((v) => (
                  <li
                    key={v.name}
                    onClick={() => handleSelectVolume(v.name)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors text-sm ${
                      selectedVolume === v.name
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{v.name}</div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {t('volume.capacityUsed', { capacity: v.capacity, used: v.used })}
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Right: File Browser */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb + Upload */}
            <div className="border-b border-border bg-muted shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 text-xs">
                <div className="flex items-center gap-1 overflow-x-auto flex-1">
                  <button
                    onClick={() => {
                      setCurrentPath('/');
                      setSelectedFile('');
                    }}
                    className={`hover:text-primary shrink-0 ${currentPath === '/' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                  >
                    /
                  </button>
                  {pathSegments.map((seg, i) => {
                    const segPath = '/' + pathSegments.slice(0, i + 1).join('/');
                    const isLast = i === pathSegments.length - 1;
                    return (
                      <span key={segPath} className="flex items-center gap-1 shrink-0">
                        <ChevronRight className="h-3 w-3 text-muted-foreground/70" />
                        <button
                          onClick={() => {
                            setCurrentPath(segPath);
                            setSelectedFile('');
                          }}
                          className={`hover:text-primary ${isLast ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                        >
                          {seg}
                        </button>
                      </span>
                    );
                  })}
                </div>
                {selectedVolume && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      title={t('volume.uploadTitle')}
                    >
                      {uploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {t('volume.upload')}
                    </Button>
                  </>
                )}
              </div>
              {uploading && (
                <div className="px-3 pb-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span className="truncate">{uploadingName}</span>
                    <span>{Math.round(uploadProgress * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {uploadError && (
                <p className="px-3 pb-2 text-[11px] text-destructive">{uploadError}</p>
              )}
            </div>

            {/* File list */}
            <div className="flex-1 overflow-auto">
              {!selectedVolume ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground/70">
                  {t('volume.selectPrompt')}
                </div>
              ) : filesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground/70">
                  {t('volume.emptyDir')}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
                        {t('volume.colName')}
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium text-muted-foreground w-24">
                        {t('volume.colSize')}
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium text-muted-foreground w-36">
                        {t('volume.colModified')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Directories first — 클릭=선택, 더블클릭/› 버튼=열기 */}
                    {dirs.map((entry) => {
                      const fullPath =
                        currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
                      const isSelected = selectedFile === fullPath;
                      return (
                        <tr
                          key={entry.name}
                          className={`border-b border-border cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                          onClick={() => handleSelectEntry(entry.name)}
                          onDoubleClick={() => handleNavigate(entry.name)}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-[#FF9500] shrink-0" />
                              <span
                                className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}
                              >
                                {entry.name}/
                              </span>
                              {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigate(entry.name);
                                }}
                                className="ml-auto p-0.5 rounded hover:bg-card text-muted-foreground/70 hover:text-foreground shrink-0"
                                title={t('volume.openFolder')}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground/70">—</td>
                          <td className="px-3 py-2 text-right text-muted-foreground/70">
                            {formatDate(entry.modifiedAt)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Files */}
                    {files.map((entry) => {
                      const fullPath =
                        currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
                      const isSelected = selectedFile === fullPath;
                      return (
                        <tr
                          key={entry.name}
                          className={`border-b border-border cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                          }`}
                          onClick={() => handleSelectEntry(entry.name)}
                        >
                          <td className="px-3 py-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            <span
                              className={`${isSelected ? 'text-primary font-medium' : 'text-foreground'}`}
                            >
                              {entry.name}
                            </span>
                            {isSelected && <Check className="h-3 w-3 text-primary" />}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground/70">
                            {formatSize(entry.size)}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground/70">
                            {formatDate(entry.modifiedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.close')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedFile}>
            <Check className="h-4 w-4" />
            {t('volume.select')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
