import React, { useRef, useState } from 'react';
import { ChecklistItemData, TextBlock, TextBlockType } from '../services/dbService';
import { ImageIcon, ClearIcon, TextIcon, PencilIcon, TrashIcon, EyeIcon, EyeOffIcon, LightbulbIcon } from './Icons';

interface ChecklistItemProps {
  item: ChecklistItemData;
  index: number;
  onToggle: (index: number) => void;
  onAddImages: (index: number, images: string[]) => void;
  onDeleteImage: (index: number, imageIndex: number) => void;
  onOpenAddTextModal: (index: number, type: TextBlockType) => void;
  onOpenEditTextModal: (index: number, textBlock: TextBlock) => void;
  onDeleteText: (index: number, textBlockId: string) => void;
}

const MAX_IMAGES = 6;

export const ChecklistItem: React.FC<ChecklistItemProps> = React.memo(({ item, index, onToggle, onAddImages, onDeleteImage, onOpenAddTextModal, onOpenEditTextModal, onDeleteText }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddTextOpen, setIsAddTextOpen] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { text, isChecked, images = [], texts = [] } = item;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    const imagePromises = filesToProcess.map((file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(base64Images => {
      onAddImages(index, base64Images);
    }).catch(error => console.error("Error al leer las imágenes", error))
    .finally(() => {
        setIsUploading(false);
    });
    
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const renderTextBlock = (textBlock: TextBlock) => {
    const containerClasses = "bg-slate-800 p-3 rounded-md relative group/block";
    const buttonClasses = "absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity";

    const EditButtons = () => (
        <div className={buttonClasses}>
            <button onClick={() => onOpenEditTextModal(index, textBlock)} className="p-1 text-slate-400 hover:text-sky-400 bg-slate-900/50 rounded"><PencilIcon className="w-4 h-4" /></button>
            <button onClick={() => onDeleteText(index, textBlock.id)} className="p-1 text-slate-400 hover:text-red-400 bg-slate-900/50 rounded"><TrashIcon className="w-4 h-4" /></button>
        </div>
    );
    
    switch(textBlock.type) {
        case 'title':
            return (
                <div className="my-4">
                    <div className="text-center mb-2">
                        <span className="text-xs font-semibold text-sky-400 bg-sky-900/50 px-2 py-1 rounded-full">TÍTULO</span>
                    </div>
                    <div className={containerClasses}>
                        <p className="text-xl font-bold text-slate-100 text-center whitespace-pre-wrap">{textBlock.content}</p>
                        <EditButtons />
                    </div>
                </div>
            );
        case 'subtitle':
            return (
                <div className="my-3">
                    <div className="text-center mb-2">
                         <span className="text-xs font-semibold text-slate-400 bg-slate-600/50 px-2 py-1 rounded-full">SUBTÍTULO</span>
                    </div>
                    <div className={containerClasses}>
                        <p className="text-lg font-semibold text-slate-300 text-center whitespace-pre-wrap">{textBlock.content}</p>
                        <EditButtons />
                    </div>
                </div>
            );
        case 'body':
            return (
                <div className="my-2">
                    <div className="mb-1">
                        <span className="text-xs font-semibold text-slate-500">PÁRRAFO</span>
                    </div>
                    <div className={containerClasses}>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">{textBlock.content}</p>
                        <EditButtons />
                    </div>
                </div>
            );
        case 'observation':
            return (
                <div className="text-sm text-slate-300 bg-slate-600/50 p-3 rounded-md border-l-4 border-amber-400 relative group/block">
                    <div className="flex items-start gap-2">
                        <LightbulbIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="whitespace-pre-wrap flex-1">{textBlock.content}</p>
                    </div>
                    <EditButtons />
                </div>
            );
        default:
            return <p className="text-slate-300 whitespace-pre-wrap">{textBlock.content}</p>;
    }
  };

  return (
    <li className="flex flex-col bg-slate-700/50 p-3 rounded-md transition-all duration-200">
      <div className="flex items-center">
        <label className="flex items-center cursor-pointer w-full group">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggle(index)}
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
                        <div key={textBlock.id}>
                             {renderTextBlock(textBlock)}
                        </div>
                    ))}
                </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, imageIndex) => (
                  <div key={imageIndex} className="group">
                    <div className="relative group aspect-square">
                        <img src={img.src} alt={`attachment ${imageIndex + 1}`} className="w-full h-full object-cover rounded-md" />
                        <button 
                          onClick={() => onDeleteImage(index, imageIndex)}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                          aria-label="Eliminar imagen"
                        >
                          <ClearIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {img.observation && (
                        <p className="text-xs text-slate-400 italic mt-1 truncate" title={img.observation}>
                            {img.observation}
                        </p>
                    )}
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
                    disabled={images.length >= MAX_IMAGES || isUploading}
                    className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                    {isUploading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Cargando...
                        </>
                    ) : (
                        <>
                            <ImageIcon className="w-4 h-4" />
                            Añadir Imagen ({images.length}/{MAX_IMAGES})
                        </>
                    )}
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
                            <button onClick={() => { onOpenAddTextModal(index, 'title'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Título</button>
                            <button onClick={() => { onOpenAddTextModal(index, 'subtitle'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Subtítulo</button>
                            <button onClick={() => { onOpenAddTextModal(index, 'body'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Párrafo</button>
                             <button onClick={() => { onOpenAddTextModal(index, 'observation'); setIsAddTextOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">Observación</button>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
});