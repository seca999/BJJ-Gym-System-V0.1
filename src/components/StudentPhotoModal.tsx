import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  Trash2, 
  Check, 
  Link as LinkIcon, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Member } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { compressAndResizeImage, STUDENT_AVATAR_PRESETS } from '../utils/imageUtils';

interface StudentPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSavePhoto: (memberId: string, photoUrl?: string) => void;
}

export const StudentPhotoModal: React.FC<StudentPhotoModalProps> = ({
  isOpen,
  onClose,
  member,
  onSavePhoto,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize photo when member opens
  useEffect(() => {
    if (member) {
      setSelectedPhoto(member.avatar || '');
      setUrlInput(member.avatar && member.avatar.startsWith('http') ? member.avatar : '');
      setErrorMessage('');
      setIsProcessing(false);
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }
    setErrorMessage('');
    setIsProcessing(true);
    try {
      const compressedDataUrl = await compressAndResizeImage(file, 360, 360, 0.85);
      setSelectedPhoto(compressedDataUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // reset input so the same file can be re-selected if desired
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) {
      setErrorMessage('Please enter an image link URL.');
      return;
    }
    setSelectedPhoto(urlInput.trim());
    setErrorMessage('');
  };

  const handleSave = () => {
    onSavePhoto(member.id, selectedPhoto.trim() || undefined);
    onClose();
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto('');
    setUrlInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl text-stone-100 overflow-hidden my-6 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-600/10 text-red-400 border border-red-900/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Student Picture</h2>
              <p className="text-xs text-stone-400">
                Update picture for <span className="text-amber-400 font-semibold">{member.fullName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Live Preview Card */}
          <div className="flex items-center gap-4 p-3.5 bg-stone-950/80 rounded-xl border border-stone-800">
            <div className="relative shrink-0">
              {selectedPhoto ? (
                <img
                  src={selectedPhoto}
                  alt={member.fullName}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-stone-700 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-stone-800 border-2 border-stone-700 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner">
                  {member.fullName.charAt(0)}
                </div>
              )}

              {selectedPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow transition-colors"
                  title="Remove picture"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm truncate">{member.fullName}</h3>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                <span className="text-[11px] text-stone-400">Joined {member.joinDate}</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                {selectedPhoto ? 'Photo ready to save' : 'No photo set (displaying initial)'}
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex border-b border-stone-800 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`pb-2 px-2 text-xs font-bold inline-flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`pb-2 px-2 text-xs font-bold inline-flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'url'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-300'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`pb-2 px-2 text-xs font-bold inline-flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === 'presets'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-stone-400 hover:text-stone-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>BJJ Presets</span>
            </button>
          </div>

          {/* Tab 1: Upload from computer/device */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-red-500 bg-red-950/20'
                    : 'border-stone-700 hover:border-stone-500 bg-stone-950/40 hover:bg-stone-950/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handleFileInputChange}
                  accept="image/*"
                  capture="user"
                  className="hidden"
                />

                <div className="w-11 h-11 mx-auto mb-2 rounded-full bg-stone-800 flex items-center justify-center text-stone-300">
                  <Upload className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-xs font-bold text-white mb-1">
                  Click to browse or drag and drop photo here
                </p>
                <p className="text-[11px] text-stone-400">
                  Supports PNG, JPG, or WEBP. Automatically optimized for fast loading.
                </p>
              </div>

              {/* Action Buttons for Mobile Camera & Reset */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold border border-stone-700 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Take Mat Photo</span>
                </button>

                {selectedPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-stone-400 hover:text-red-400 text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Picture</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: URL Input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Paste Direct Image Link (HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/student-photo.jpg"
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-lg border border-stone-700 transition-colors"
                  >
                    Preview
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-stone-400">
                You can link an image from cloud storage, Discord, Google Drive (direct link), or your gym website.
              </p>
            </div>
          )}

          {/* Tab 3: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Choose a Brazilian Jiu-Jitsu Athlete Headshot
              </label>
              <div className="grid grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                {STUDENT_AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedPhoto === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPhoto(preset.url);
                        setUrlInput(preset.url);
                      }}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                        isSelected
                          ? 'border-red-500 ring-2 ring-red-500/30'
                          : 'border-stone-800 hover:border-stone-600'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-16 object-cover rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 shadow">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <div className="text-[10px] font-semibold text-stone-300 mt-1 truncate px-1 text-center">
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-stone-800 flex items-center justify-between bg-stone-950/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-xs font-bold tracking-wide transition-colors shadow-xs disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Save Picture</span>
          </button>
        </div>
      </div>
    </div>
  );
};
