import { useState } from 'react';
import { Folder, FileText, ChevronRight, Loader2, HardDrive, Check } from 'lucide-react';
import { useVolumes, useVolumeFiles } from '@/hooks/useK8s';
import { Button } from '@/components/ui/Button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/Dialog';
// types used via useVolumeFiles hook

interface VolumeBrowserProps {
  namespace: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (volumeName: string, filePath: string) => void;
}

export function VolumeBrowser({ namespace, open, onOpenChange, onSelect }: VolumeBrowserProps) {
  const { data: volumeList, isLoading: volumesLoading } = useVolumes(namespace);
  const volumes = volumeList?.items ?? [];

  const [selectedVolume, setSelectedVolume] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState('');

  const { data: listing, isLoading: filesLoading } = useVolumeFiles(namespace, selectedVolume, currentPath);
  const entries = listing?.entries ?? [];

  const dirs = entries.filter((e) => e.type === 'DIRECTORY');
  const files = entries.filter((e) => e.type === 'FILE');

  const handleSelectVolume = (name: string) => {
    setSelectedVolume(name);
    setCurrentPath('/');
    setSelectedFile('');
  };

  const handleNavigate = (dirName: string) => {
    const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`;
    setCurrentPath(newPath);
    setSelectedFile('');
  };

  const handleSelectFile = (fileName: string) => {
    const fullPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
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
    onOpenChange(false);
  };

  // breadcrumb segments
  const pathSegments = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Volume 파일 선택
          </DialogTitle>
        </DialogHeader>

        {/* Selected path preview */}
        {selectedFile && (
          <div className="text-xs text-text-secondary bg-muted-bg rounded-md px-3 py-2 font-mono truncate">
            Volume: {selectedVolume} &rarr; {selectedFile}
          </div>
        )}

        {/* 2-Column Layout: Volume List + File Browser */}
        <div className="flex border border-border rounded-lg overflow-hidden h-[400px]">
          {/* Left: Volume List */}
          <div className="w-48 shrink-0 border-r border-border flex flex-col">
            <div className="px-3 py-2 border-b border-border bg-table-header-bg shrink-0">
              <span className="text-xs font-medium text-text-secondary">Volume</span>
            </div>
            <ul className="flex-1 overflow-auto">
              {volumesLoading ? (
                <li className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </li>
              ) : volumes.length === 0 ? (
                <li className="flex items-center justify-center py-10 text-xs text-text-muted">Volume 없음</li>
              ) : (
                volumes.map((v) => (
                  <li
                    key={v.name}
                    onClick={() => handleSelectVolume(v.name)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors text-sm ${
                      selectedVolume === v.name
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted-bg text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium">{v.name}</div>
                        <div className="text-[10px] text-text-muted">{v.capacity} (사용: {v.used})</div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Right: File Browser */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Breadcrumb */}
            <div className="px-3 py-2 border-b border-border bg-table-header-bg shrink-0 flex items-center gap-1 text-xs overflow-x-auto">
              <button
                onClick={() => { setCurrentPath('/'); setSelectedFile(''); }}
                className={`hover:text-primary shrink-0 ${currentPath === '/' ? 'text-text-primary font-medium' : 'text-text-secondary'}`}
              >
                /
              </button>
              {pathSegments.map((seg, i) => {
                const segPath = '/' + pathSegments.slice(0, i + 1).join('/');
                const isLast = i === pathSegments.length - 1;
                return (
                  <span key={segPath} className="flex items-center gap-1 shrink-0">
                    <ChevronRight className="h-3 w-3 text-text-muted" />
                    <button
                      onClick={() => { setCurrentPath(segPath); setSelectedFile(''); }}
                      className={`hover:text-primary ${isLast ? 'text-text-primary font-medium' : 'text-text-secondary'}`}
                    >
                      {seg}
                    </button>
                  </span>
                );
              })}
            </div>

            {/* File list */}
            <div className="flex-1 overflow-auto">
              {!selectedVolume ? (
                <div className="flex items-center justify-center h-full text-xs text-text-muted">
                  왼쪽에서 Volume을 선택하세요
                </div>
              ) : filesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                </div>
              ) : entries.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-text-muted">
                  빈 디렉토리입니다
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted-bg/50 sticky top-0">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-1.5 font-medium text-text-secondary">이름</th>
                      <th className="text-right px-3 py-1.5 font-medium text-text-secondary w-24">크기</th>
                      <th className="text-right px-3 py-1.5 font-medium text-text-secondary w-36">수정일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Directories first */}
                    {dirs.map((entry) => (
                      <tr
                        key={entry.name}
                        className="border-b border-border hover:bg-primary/5 cursor-pointer transition-colors"
                        onDoubleClick={() => handleNavigate(entry.name)}
                        onClick={() => handleNavigate(entry.name)}
                      >
                        <td className="px-3 py-2 flex items-center gap-2">
                          <Folder className="h-4 w-4 text-[#FF9500] shrink-0" />
                          <span className="text-text-primary font-medium">{entry.name}/</span>
                        </td>
                        <td className="px-3 py-2 text-right text-text-muted">—</td>
                        <td className="px-3 py-2 text-right text-text-muted">{formatDate(entry.modifiedAt)}</td>
                      </tr>
                    ))}
                    {/* Files */}
                    {files.map((entry) => {
                      const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
                      const isSelected = selectedFile === fullPath;
                      return (
                        <tr
                          key={entry.name}
                          className={`border-b border-border cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted-bg'
                          }`}
                          onClick={() => handleSelectFile(entry.name)}
                        >
                          <td className="px-3 py-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-text-muted shrink-0" />
                            <span className={`${isSelected ? 'text-primary font-medium' : 'text-text-primary'}`}>
                              {entry.name}
                            </span>
                            {isSelected && <Check className="h-3 w-3 text-primary" />}
                          </td>
                          <td className="px-3 py-2 text-right text-text-muted">{formatSize(entry.size)}</td>
                          <td className="px-3 py-2 text-right text-text-muted">{formatDate(entry.modifiedAt)}</td>
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
          <Button variant="outline" onClick={handleClose}>닫기</Button>
          <Button onClick={handleConfirm} disabled={!selectedFile}>
            <Check className="h-4 w-4" />
            선택
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
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}
