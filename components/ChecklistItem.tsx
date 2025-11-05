import React, { useRef, useState } from 'react';
import { ChecklistItemData, TextBlock, TextBlockType } from '../services/dbService';
import { ImageIcon, ClearIcon, TextIcon, PencilIcon, TrashIcon, EyeIcon, EyeOffIcon, LightbulbIcon } from './Icons';

interface ChecklistItemProps {
  item: ChecklistItemData;
  onToggle: () => void;
  onAddImages: (images: string[]) => void;
  onDeleteImage: (imageIndex: number) => void;
  onOpenAddTextModal: (type: TextBlockType) => void;
  onOpenEditTextModal: (textBlock: TextBlock) => void;
  onDeleteText: (textBlockId: string) => void;
}

const MAX_IMAGES = 6;

export const ChecklistItem: React.FC<ChecklistItemProps> = ({ item, onToggle, onAddImages, onDeleteImage, onOpenAddTextModal, onOpenEditTextModal, onDeleteText }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddTextOpen, setIsAddTextOpen] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(true);
  const { text, isChecked, images = [], texts = [] } = item;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    // FIX: Explicitly type `file` as `File` to resolve TypeScript error where it was inferred as `unknown`.
    const imagePromises = filesToProcess.map((file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(base64Images => {
      onAddImages(base64Images);
    }).catch(error => console.error("Error al leer las imágenes", error));
    
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getTextStyle = (type: TextBlockType) => {
      switch(type) {
          case 'title': return 'text-lg font-bold text-slate-200 mt-2';
          case 'subtitle': return 'text-md font-semibold text-slate-300 mt-1';
          case 'body': return 'text-sm text-slate-400 whitespace-pre-wrap';
          case 'observation': return 'text-sm text-slate-300 bg-slate-600/50 p-3 rounded-md border-l-4 border-amber-400';
          default: return 'text-slate-300';
      }
  }

  return (
    <li className="flex flex-col bg-slate-700/50 p-3 rounded-md transition-all duration-200">
      <div className="flex items-center">
        <label className="flex items-center cursor-pointer w-full group">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onToggle}
            className="hidden"
          />
          <div className={`w-5 h-5 mr-4 border-2 rounded flex-shrink-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isChecked ? 'bg-sky-500 border-sky-500' : 'border-slate-500 group-hover:border-sky-500'}`}>
            {isChecked && (
                <svg className="w-3 h-3 text-white fill-current transform transition-transform duration-200 scale-100" viewBox="0 0 20 20">
                    <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                </svg>
            )}
          </div>
          <span className={`flex-grow text-slate-300 ${isChecked ? 'line-through text-slate-500' : ''} transition-colors duration-200`}>
            {text}
          </span>
        </label>
        <button onClick={() => setIsContentVisible(!isContentVisible)} className="ml-2 p-1 text-slate-400 hover:text-white flex-shrink-0">
            {isContentVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
        </button>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out overflow-hidden grid ${isContentVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0">
          <div className="pt-3 pl-9 space-y-3">
            {/* Texts */}
            {texts.length > 0 && (
                <div className="space-y-2">
                    {texts.map(textBlock => (
                        <div key={textBlock.id} className="group relative pr-12">
                            {textBlock.type === 'observation' ? (
                                <div className={getTextStyle('observation')}>
                                    <div className="flex items-start gap-2">
                                        <LightbulbIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <p className="whitespace-pre-wrap flex-1">{textBlock.content}</p>
                                    </div>
                                </div>
                             ) : (
                                <p className={getTextStyle(textBlock.type)}>{textBlock.content}</p>
                             )}
                             <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onOpenEditTextModal(textBlock)} className="p-1 text-slate-400 hover:text-sky-400"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => onDeleteText(textBlock.id)} className="p-1 text-slate-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                             </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {images.map((imgSrc, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img src={imgSrc} alt={`attachment ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                    <button 
                      onClick={() => onDeleteImage(index)}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      aria-label="Eliminar imagen"
                    >
                      <ClearIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                />
                <button 
                onClick={triggerFileInput}
                disabled={images.length >= MAX_IMAGES}
                className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                    <ImageIcon className="w-4 h-4" />
                    Añadir Imagen ({images.length}/{MAX_IMAGES})
                </button>
                
                <div className="relative">
                    <button 
                        onClick={() => setIsAddTextOpen(!isAddTextOpen)}
                        className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                    >
                        <TextIcon className="w-4 h-4" />
                        Añadir Texto
                    </button>
                    {isAddTextOpen && (
                        <div className="absolute bottom-full mb-2 w-32 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10">
                            <button onClick={() => { onOpenAddTextModal('title'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Título</button>
                            <button onClick={() => { onOpenAddTextModal('subtitle'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Subtítulo</button>
                            <button onClick={() => { onOpenAddTextModal('body'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Párrafo</button>
                             <button onClick={() => { onOpenAddTextModal('observation'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Observación</button>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};
