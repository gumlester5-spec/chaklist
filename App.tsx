
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { generateChecklistFromText } from './services/geminiService';
import { ChecklistItem } from './components/ChecklistItem';
import { CopyIcon, SparklesIcon, PlusIcon, TrashIcon, ClearIcon, DownloadIcon, PencilIcon, TextIcon, LightbulbIcon, DownloadCloudIcon, RefreshCwIcon, SettingsIcon, UploadCloudIcon, ListIcon } from './components/Icons';
import { initDB, getAllLists, addList, updateList, deleteList, Checklist, ChecklistItemData, TextBlock, TextBlockType, clearAllData, importLists, ImageWithObservation } from './services/dbService';

type ModalState = {
  isOpen: boolean;
  itemIndex: number | null;
  textBlock: TextBlock | null;
  isNew: boolean;
}

interface ReportMetadata {
    subject: string;
    professor: string;
    team: string;
    date: string;
    objective: string;
    tools: string;
    safety: string;
}

interface ImageObservationModalState {
    isOpen: boolean;
    itemIndex: number | null;
    newImages: string[];
}

type PdfDesign = 'moderno' | 'clasico' | 'minimalista';

const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = (err) => reject(err);
        img.src = src;
    });
};


const exportPDF = async (list: Checklist, metadata: ReportMetadata, design: PdfDesign, onFinish: () => void, setError: (e: string | null) => void) => {
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        console.error("jsPDF is not loaded");
        setError("La librería PDF no está cargada.");
        return;
    }

    setError(null);
    
    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

        const PAGE_WIDTH = doc.internal.pageSize.getWidth();
        const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
        const MARGIN = 60;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
        
        let FONT_FAMILY_H: string, FONT_FAMILY_P: string, COLORS: any, FONT_SIZES: any;

        switch (design) {
            case 'clasico':
                FONT_FAMILY_H = 'times'; FONT_FAMILY_P = 'times';
                COLORS = { TEXT: '#000000', ACCENT: '#000000', BORDER: '#AAAAAA' };
                FONT_SIZES = { H1: 22, H2: 16, H3: 14, P: 12, FOOTER: 9 };
                break;
            case 'minimalista':
                FONT_FAMILY_H = 'helvetica'; FONT_FAMILY_P = 'helvetica';
                COLORS = { TEXT: '#222222', ACCENT: '#000000', BORDER: '#EAEAEA' };
                FONT_SIZES = { H1: 20, H2: 16, H3: 12, P: 10, FOOTER: 8 };
                break;
            case 'moderno':
            default:
                FONT_FAMILY_H = 'helvetica'; FONT_FAMILY_P = 'helvetica';
                COLORS = { TEXT: '#333333', ACCENT: '#003366', BORDER: '#DDDDDD' };
                FONT_SIZES = { H1: 24, H2: 18, H3: 14, P: 11, FOOTER: 9 };
                break;
        }
        
        let y = 0;
        let page = 1;

        const addPageFooter = (pageNum: number) => {
            doc.setFont(FONT_FAMILY_P, 'normal');
            doc.setFontSize(FONT_SIZES.FOOTER);
            doc.setTextColor(COLORS.TEXT);
            doc.text(`Página ${pageNum}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 30, { align: 'center' });
        };
        
        const addNewPage = () => {
            if (design === 'clasico') {
                 doc.setDrawColor(COLORS.BORDER);
                 doc.rect(MARGIN/2, MARGIN/2, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN);
            }
            addPageFooter(page);
            doc.addPage();
            page++;
            y = MARGIN;
        }

        const checkNewPage = (requiredHeight: number) => {
            if (y + requiredHeight > PAGE_HEIGHT - MARGIN) {
                addNewPage();
            }
        };
        
        // --- PAGE 1: COVER PAGE ---
        doc.setFont(FONT_FAMILY_H, 'bold');
        doc.setFontSize(36);
        doc.setTextColor(COLORS.ACCENT);
        doc.text("Informe de Trabajo", PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 120, { align: 'center' });
        
        doc.setFont(FONT_FAMILY_P, 'normal');
        doc.setFontSize(FONT_SIZES.H1);
        doc.setTextColor(COLORS.TEXT);
        const titleLines = doc.splitTextToSize(list.title, CONTENT_WIDTH - 20);
        doc.text(titleLines, PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 80, { align: 'center' });
        
        y = PAGE_HEIGHT / 2;
        const coverDetails = [
            { label: 'Profesor:', value: metadata.professor },
            { label: 'Integrantes:', value: metadata.team },
            { label: 'Fecha de Realización:', value: metadata.date },
        ];
        doc.setFontSize(FONT_SIZES.H3);
        coverDetails.forEach(detail => {
            doc.setFont(FONT_FAMILY_P, 'bold');
            doc.text(detail.label, MARGIN + 100, y, { align: 'right' });
            doc.setFont(FONT_FAMILY_P, 'normal');
            doc.text(detail.value, MARGIN + 110, y);
            y += 25;
        });
        
        addNewPage();

        // --- PAGE 2: INTRODUCTION ---
        doc.setFont(FONT_FAMILY_H, 'bold');
        doc.setFontSize(FONT_SIZES.H2);
        doc.setTextColor(COLORS.ACCENT);
        doc.text("1.0 Objetivo del Trabajo", MARGIN, y);
        if (design === 'clasico') doc.line(MARGIN, y + 5, MARGIN + 150, y + 5);
        y += 30;

        doc.setFont(FONT_FAMILY_P, 'normal');
        doc.setFontSize(FONT_SIZES.P);
        doc.setTextColor(COLORS.TEXT);
        const objectiveLines = doc.splitTextToSize(metadata.objective, CONTENT_WIDTH);
        doc.text(objectiveLines, MARGIN, y);
        y += objectiveLines.length * FONT_SIZES.P * 1.4 + 40;

        doc.setFont(FONT_FAMILY_H, 'bold');
        doc.setFontSize(FONT_SIZES.H2);
        doc.setTextColor(COLORS.ACCENT);
        doc.text("2.0 Equipo y Seguridad", MARGIN, y);
        if (design === 'clasico') doc.line(MARGIN, y + 5, MARGIN + 150, y + 5);
        y += 30;
        
        doc.setFont(FONT_FAMILY_P, 'bold');
        doc.setFontSize(FONT_SIZES.P);
        doc.text("Herramientas:", MARGIN, y);
        doc.setFont(FONT_FAMILY_P, 'normal');
        doc.text(metadata.tools, MARGIN + 80, y);
        y += 25;

        doc.setFont(FONT_FAMILY_P, 'bold');
        doc.text("Seguridad:", MARGIN, y);
        doc.setFont(FONT_FAMILY_P, 'normal');
        doc.text(metadata.safety, MARGIN + 80, y);
        y += 40;
        
        // --- SUBSEQUENT PAGES: PROCESS ---
        checkNewPage(40);
        doc.setFont(FONT_FAMILY_H, 'bold');
        doc.setFontSize(FONT_SIZES.H2);
        doc.setTextColor(COLORS.ACCENT);
        doc.text("3.0 Proceso de Mantenimiento", MARGIN, y);
         if (design === 'clasico') doc.line(MARGIN, y + 5, MARGIN + 200, y + 5);
        y += 30;
        
        let imageCounter = 1;

        for (const item of list.items) {
            checkNewPage(40);
            doc.setFont(FONT_FAMILY_H, 'bold');
            doc.setFontSize(FONT_SIZES.H3);
            doc.setTextColor(COLORS.TEXT);
            const stepTitle = item.text;
            const stepTitleLines = doc.splitTextToSize(stepTitle, CONTENT_WIDTH);
            doc.text(stepTitleLines, MARGIN, y);
            y += stepTitleLines.length * FONT_SIZES.H3 * 1.2 + 15;

            (item.texts || []).forEach(textBlock => {
                let fontSize, fontStyle, color;
                let isObservation = textBlock.type === 'observation';
                
                if (isObservation) {
                    fontSize = FONT_SIZES.P; fontStyle = 'italic'; color = COLORS.TEXT;
                } else if (textBlock.type === 'title') {
                    fontSize = FONT_SIZES.H3; fontStyle = 'bold'; color = COLORS.TEXT;
                } else if (textBlock.type === 'subtitle') {
                    fontSize = FONT_SIZES.P; fontStyle = 'bold'; color = COLORS.TEXT;
                } else {
                    fontSize = FONT_SIZES.P; fontStyle = 'normal'; color = COLORS.TEXT;
                }
                
                const textLines = doc.splitTextToSize(textBlock.content, CONTENT_WIDTH - 15);
                const requiredHeight = textLines.length * fontSize * 1.4 + 10;
                checkNewPage(requiredHeight);

                if (isObservation) {
                    if (design === 'moderno') {
                        doc.setFillColor('#FEFCE8'); // Light yellow
                        doc.setDrawColor(COLORS.BORDER);
                        doc.roundedRect(MARGIN, y-5, CONTENT_WIDTH, requiredHeight + 10, 5, 5, 'FD');
                        doc.setFont(FONT_FAMILY_P, 'bold');
                        doc.setFontSize(FONT_SIZES.P);
                        doc.text("Observación:", MARGIN + 10, y + 10);
                        doc.setFont(FONT_FAMILY_P, fontStyle);
                        doc.text(textLines, MARGIN + 15, y + 30);
                        y += requiredHeight + 15;
                    } else { // Clasico and Minimalista
                        doc.setFont(FONT_FAMILY_P, 'bold');
                        doc.setFontSize(FONT_SIZES.P);
                        doc.text("Observación:", MARGIN + 15, y);
                        doc.setFont(FONT_FAMILY_P, 'italic');
                        doc.text(textLines, MARGIN + 15, y + FONT_SIZES.P * 1.2);
                        y += requiredHeight + 10;
                    }
                } else {
                     doc.setFont(FONT_FAMILY_P, fontStyle);
                     doc.setFontSize(fontSize);
                     doc.setTextColor(color);
                     doc.text(textLines, MARGIN + 15, y);
                     y += requiredHeight;
                }
            });
            
            for (const img of (item.images || [])) {
                try {
                    const { width: originalWidth, height: originalHeight } = await getImageDimensions(img.src);
                    const aspectRatio = originalWidth / originalHeight;

                    const maxImgWidth = CONTENT_WIDTH * 0.85; 
                    const maxImgHeight = PAGE_HEIGHT * 0.6; 

                    let pdfImgWidth = maxImgWidth;
                    let pdfImgHeight = pdfImgWidth / aspectRatio;

                    if (pdfImgHeight > maxImgHeight) {
                        pdfImgHeight = maxImgHeight;
                        pdfImgWidth = pdfImgHeight * aspectRatio;
                    }

                    let requiredHeight = pdfImgHeight + 30;
                    let observationLines: string[] = [];

                    if (img.observation) {
                        observationLines = doc.splitTextToSize(img.observation, CONTENT_WIDTH - 20);
                        requiredHeight += observationLines.length * (FONT_SIZES.P * 0.9) * 1.2 + 15;
                    }
                    
                    checkNewPage(requiredHeight);

                    const imgX = (PAGE_WIDTH - pdfImgWidth) / 2;
                    doc.addImage(img.src, 'JPEG', imgX, y, pdfImgWidth, pdfImgHeight);
                    y += pdfImgHeight + 5;

                    if (img.observation) {
                        doc.setFont(FONT_FAMILY_P, 'normal');
                        doc.setFontSize(FONT_SIZES.P * 0.9);
                        doc.setTextColor('#555555');
                        doc.text(observationLines, PAGE_WIDTH / 2, y + 10, { align: 'center', maxWidth: CONTENT_WIDTH - 20 });
                        y += observationLines.length * (FONT_SIZES.P * 0.9) * 1.2 + 15;
                    }

                    doc.setFont(FONT_FAMILY_P, 'italic');
                    doc.setFontSize(FONT_SIZES.FOOTER);
                    doc.setTextColor(COLORS.TEXT);
                    const caption = `Figura ${imageCounter}`;
                    doc.text(caption, PAGE_WIDTH / 2, y + 10, { align: 'center' });
                    y += 25;
                    imageCounter++;
                } catch (e) { 
                    console.error("Could not add image", e);
                    checkNewPage(30);
                    doc.setFont(FONT_FAMILY_P, 'italic');
                    doc.setFontSize(FONT_SIZES.P);
                    doc.setTextColor('#CC0000');
                    doc.text('[Error: No se pudo cargar la imagen para el informe]', PAGE_WIDTH / 2, y, { align: 'center' });
                    y += 20;
                }
            }
        }
        
        if (design === 'clasico') {
             doc.setDrawColor(COLORS.BORDER);
             doc.rect(MARGIN/2, MARGIN/2, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN);
        }
        addPageFooter(page);
        doc.save(`${list.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch(e) {
        console.error("Error generating PDF", e);
        setError("Ocurrió un error al generar el PDF.");
    } finally {
        onFinish();
    }
};

const App: React.FC = () => {
  const [lists, setLists] = useState<Checklist[]>([]);
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [view, setView] = useState<'welcome' | 'newList' | 'detail'>('welcome');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDesignSelectorOpen, setIsDesignSelectorOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<PdfDesign>('moderno');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [observationModalState, setObservationModalState] = useState<ImageObservationModalState>({
    isOpen: false,
    itemIndex: null,
    newImages: [],
  });

  // PWA Install and Update State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    // PWA Install prompt logic
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        setInstallPrompt(e);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Service Worker update logic
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        const swUrl = `${window.location.origin}/sw.js`;
        navigator.serviceWorker.register(swUrl).then(registration => {
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.onstatechange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  waitingWorkerRef.current = newWorker;
                  setIsUpdateAvailable(true);
                }
              };
            }
          };
        }).catch(error => {
          console.error('Service Worker registration failed:', error);
        });
      };
      
      // FIX: Defer registration until the page is fully loaded to prevent an "invalid state" error.
      window.addEventListener('load', registerServiceWorker);

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  const loadDataFromDb = useCallback(async () => {
    // This function is for explicit reloads, like after an import.
    setIsLoading(true);
    try {
      await initDB();
      const storedLists = await getAllLists();
      setLists(storedLists);
      if (storedLists.length > 0) {
        // If the active list was deleted or doesn't exist, select the first one.
        if (!activeListId || !storedLists.some(l => l.id === activeListId)) {
          setActiveListId(storedLists[0].id);
        }
        setView('detail');
      } else {
        setActiveListId(null);
        setView('welcome');
      }
    } catch (e) {
      console.error("Failed to load lists from DB", e);
      setError("No se pudieron cargar las listas guardadas.");
    } finally {
      setIsLoading(false);
    }
  }, [activeListId]);

  // Effect for initial data load. Runs only once on mount.
  useEffect(() => {
    const initialLoad = async () => {
      try {
        await initDB();
        const storedLists = await getAllLists();
        setLists(storedLists);
        if (storedLists.length > 0) {
          // On initial load, activeListId is null, so just pick the first.
          setActiveListId(storedLists[0].id);
          setView('detail');
        } else {
          setActiveListId(null);
          setView('welcome');
        }
      } catch (e) {
        console.error("Failed to load lists from DB", e);
        setError("No se pudieron cargar las listas guardadas.");
      } finally {
        setIsLoading(false);
      }
    };
    initialLoad();
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setInstallPrompt(null);
  };
  
  const handleUpdateApp = () => {
    if (waitingWorkerRef.current) {
        waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
        setIsUpdateAvailable(false);
    }
  };

  const handleCreateNew = () => {
    setActiveListId(null);
    setView('newList');
    setIsSidebarOpen(false);
  };

  const handleCancelNewList = () => {
    if (lists.length > 0) {
      // Revert to the detail view of the first list (which is the most recent)
      setActiveListId(lists[0].id);
      setView('detail');
    } else {
      // If there are no lists, go back to the welcome screen
      setView('welcome');
    }
  };

  const handleSelectList = useCallback((id: number) => {
    setActiveListId(id);
    setView('detail');
    setIsSidebarOpen(false);
  }, []);
  
  const handleGenerateAndSave = async (inputText: string) => {
    if (!inputText.trim()) {
      setError('Por favor, introduce algo de texto para generar una lista.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const itemsText = await generateChecklistFromText(inputText);
      const newItems: ChecklistItemData[] = itemsText.map(text => ({ text, isChecked: false, images: [], texts: [] }));
      const newList: Checklist = {
        id: Date.now(),
        title: inputText.split(' ').slice(0, 5).join(' ') + '...',
        createdAt: Date.now(),
        items: newItems,
      };
      await addList(newList);
      const updatedLists = await getAllLists();
      setLists(updatedLists);
      setActiveListId(newList.id);
      setView('detail');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo generar la lista. Por favor, inténtalo de nuevo.';
      setError(message);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteList = async (idToDelete: number) => {
    try {
        await deleteList(idToDelete);
        const updatedLists = lists.filter(l => l.id !== idToDelete);
        setLists(updatedLists);
        if (activeListId === idToDelete) {
            if (updatedLists.length > 0) {
                setActiveListId(updatedLists[0].id);
                setView('detail');
            } else {
                setActiveListId(null);
                setView('welcome');
            }
        }
    } catch (e) {
        console.error("Failed to delete list", e);
        setError("No se pudo eliminar la lista.");
    }
  };
  
  const handleUpdateList = useCallback(async (updatedList: Checklist) => {
    try {
        await updateList(updatedList);
        setLists(currentLists => currentLists.map(l => l.id === updatedList.id ? updatedList : l));
    } catch(e) {
        console.error("Failed to update list", e);
        setError("No se pudo actualizar la lista.");
    }
  }, []);
  
  const handleDeleteAllData = async () => {
      try {
          await clearAllData();
          setLists([]);
          setActiveListId(null);
          setView('welcome');
      } catch (e) {
          console.error("Failed to delete all data", e);
          setError("Error al eliminar los datos.");
      }
  };

  const activeList = useMemo(() => lists.find(l => l.id === activeListId), [lists, activeListId]);

  const handleOpenObservationModal = useCallback((itemIndex: number, newImages: string[]) => {
      setObservationModalState({
          isOpen: true,
          itemIndex,
          newImages,
      });
  }, []);

  const handleSaveObservations = useCallback((observations: string[]) => {
      const { itemIndex, newImages } = observationModalState;
      if (itemIndex === null || !activeList) return;

      const newImagesWithObs: ImageWithObservation[] = newImages.map((src, idx) => ({
          src,
          observation: observations[idx] || '',
      }));

      const updatedList = { ...activeList };
      const newItems = [...updatedList.items];
      const currentImages = newItems[itemIndex].images || [];
      newItems[itemIndex].images = [...currentImages, ...newImagesWithObs];
      updatedList.items = newItems;

      handleUpdateList(updatedList);
      setObservationModalState({ isOpen: false, itemIndex: null, newImages: [] });
  }, [observationModalState, activeList, handleUpdateList]);

  const handleDeleteImage = useCallback((itemIndex: number, imageIndex: number) => {
      if (!activeList) return;
      const updatedList = { ...activeList };
      const newItems = [...updatedList.items];
      const currentImages = newItems[itemIndex].images || [];
      newItems[itemIndex].images = currentImages.filter((_, idx) => idx !== imageIndex);
      updatedList.items = newItems;
      handleUpdateList(updatedList);
  }, [activeList, handleUpdateList]);

  const handleStartExport = () => {
    setIsDesignSelectorOpen(true);
  };
  
  const handleDesignSelected = (design: PdfDesign) => {
    setSelectedDesign(design);
    setIsDesignSelectorOpen(false);
    setIsReportModalOpen(true);
  };

  const handleExecuteExport = (metadata: ReportMetadata) => {
    if (activeList) {
        exportPDF(activeList, metadata, selectedDesign, () => setIsReportModalOpen(false), setError);
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400">
            Cargando listas...
        </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-slate-900 text-slate-100 overflow-hidden">
      {isUpdateAvailable && <UpdateAvailableToast onUpdate={handleUpdateApp} />}
       {isDesignSelectorOpen && (
        <PdfDesignSelectorModal
            onClose={() => setIsDesignSelectorOpen(false)}
            onSelect={handleDesignSelected}
        />
      )}
      {isReportModalOpen && activeList && (
        <ReportMetadataModal 
            listTitle={activeList.title}
            onClose={() => setIsReportModalOpen(false)}
            onExport={handleExecuteExport}
        />
      )}
      {isSettingsModalOpen && (
          <SettingsModal 
              onClose={() => setIsSettingsModalOpen(false)}
              onImport={loadDataFromDb}
              onDeleteAll={handleDeleteAllData}
          />
      )}
      {observationModalState.isOpen && (
          <ImageObservationModal
              images={observationModalState.newImages}
              onClose={() => setObservationModalState({ isOpen: false, itemIndex: null, newImages: [] })}
              onSave={handleSaveObservations}
          />
      )}
      <Sidebar 
        lists={lists}
        activeListId={activeListId}
        onCreateNew={handleCreateNew}
        onSelectList={handleSelectList}
        onDeleteList={handleDeleteList}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        installPrompt={installPrompt}
        onInstall={handleInstallClick}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />
      <main className="flex-1 flex flex-col overflow-y-auto pb-20 lg:pb-0">
        <header className="flex lg:hidden items-center justify-between p-4 border-b border-slate-700/80 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
                Checklister IA
            </h1>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {error && <p className="text-red-400 mb-4">{error}</p>}
            {view === 'welcome' && <WelcomeScreen onCreateNew={handleCreateNew} />}
            {view === 'newList' && <NewChecklist onGenerate={handleGenerateAndSave} isGenerating={isGenerating} onCancel={handleCancelNewList} />}
            {view === 'detail' && activeList && (
                <ChecklistDetail 
                    list={activeList} 
                    onUpdate={handleUpdateList} 
                    onStartExport={handleStartExport}
                    onAddImages={handleOpenObservationModal}
                    onDeleteImage={handleDeleteImage}
                />
            )}
        </div>
      </main>
      <BottomNavBar 
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onCreateNew={handleCreateNew}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />
    </div>
  );
};

// --- Sub-components ---

interface BottomNavBarProps {
    onOpenSidebar: () => void;
    onCreateNew: () => void;
    onOpenSettings: () => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onOpenSidebar, onCreateNew, onOpenSettings }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 lg:hidden z-20">
            <footer className="absolute inset-0 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 flex justify-around items-center px-2">
                <button onClick={onOpenSidebar} className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-sky-400 transition-colors h-full rounded-md hover:bg-slate-700/50">
                    <ListIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs tracking-wide">Listas</span>
                </button>
                <button 
                    onClick={onCreateNew} 
                    className="flex-1 flex flex-col items-center justify-center text-sky-400 hover:text-sky-300 transition-colors h-full rounded-md hover:bg-slate-700/50"
                    aria-label="Crear nueva lista"
                >
                    <PlusIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs tracking-wide">Nueva</span>
                </button>
                <button onClick={onOpenSettings} className="flex-1 flex flex-col items-center justify-center text-slate-400 hover:text-sky-400 transition-colors h-full rounded-md hover:bg-slate-700/50">
                    <SettingsIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs tracking-wide">Ajustes</span>
                </button>
            </footer>
        </div>
    );
};

interface SidebarProps {
  lists: Checklist[];
  activeListId: number | null;
  onCreateNew: () => void;
  onSelectList: (id: number) => void;
  onDeleteList: (id: number) => void;
  isOpen: boolean;
  onClose: () => void;
  installPrompt: any;
  onInstall: () => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ lists, activeListId, onCreateNew, onSelectList, onDeleteList, isOpen, onClose, installPrompt, onInstall, onOpenSettings }) => {
    return (
    <>
      <div 
          className={`fixed inset-0 bg-black/60 z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
          aria-hidden="true"
      />
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-800 p-4 flex flex-col h-full border-r border-slate-700 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
              Mis Listas
            </h1>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white lg:hidden" aria-label="Cerrar menú">
                <ClearIcon className="w-6 h-6" />
            </button>
        </div>
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-4 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-all duration-200"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Lista
        </button>
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {lists.map(list => (
              <li key={list.id}>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onSelectList(list.id); }}
                  className={`group flex justify-between items-center p-2 rounded-md text-sm truncate ${activeListId === list.id ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
                >
                    <span className="flex-1 truncate">
                        {list.title}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteList(list.id); }} className="ml-2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <footer className="mt-auto pt-4 border-t border-slate-700/80 space-y-2">
            {installPrompt && (
                <button
                    onClick={onInstall}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-all duration-200"
                >
                    <DownloadCloudIcon className="w-5 h-5" />
                    Instalar App
                </button>
            )}
            <button
                onClick={onOpenSettings}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-all duration-200"
            >
                <SettingsIcon className="w-5 h-5" />
                Configuración
            </button>
        </footer>
      </aside>
    </>
    );
};

const WelcomeScreen: React.FC<{ onCreateNew: () => void }> = ({ onCreateNew }) => (
    <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in-0 duration-500">
        <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <SparklesIcon className="relative w-24 h-24 text-transparent bg-clip-text bg-gradient-to-tr from-sky-400 to-indigo-500 drop-shadow-lg" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 mb-3">
            Da vida a tus ideas.
        </h2>
        <p className="mb-8 max-w-md text-slate-400">
            Transforma cualquier texto en una lista de tareas organizada con el poder de la IA.
        </p>
        <button 
            onClick={onCreateNew} 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:scale-105 hover:shadow-sky-500/30 transition-all duration-300 ease-in-out"
        >
            <PlusIcon className="w-5 h-5"/>
            Crear Primera Lista
        </button>
    </div>
);

interface NewChecklistProps {
    onGenerate: (text: string) => void;
    isGenerating: boolean;
    onCancel: () => void;
}

const NewChecklist: React.FC<NewChecklistProps> = ({ onGenerate, isGenerating, onCancel }) => {
    const [inputText, setInputText] = useState('');
    
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-2xl font-bold text-slate-300 mb-4">Crear Nueva Lista</h2>
            <p className="text-slate-400 mb-4">Pega tu texto desordenado y lo convertiremos en una lista de verificación clara y organizada.</p>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej: necesito comprar leche, huevos, pan, y no olvidar pasear al perro y llamar a mamá..."
              className="w-full flex-1 p-4 bg-slate-800 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-200 resize-none placeholder-slate-500"
              rows={10}
            />
            <div className="mt-4 flex items-center justify-end gap-3">
                <button
                    onClick={onCancel}
                    type="button"
                    className="px-6 py-3 bg-slate-700 text-slate-300 font-medium rounded-lg hover:bg-slate-600 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={() => onGenerate(inputText)}
                    disabled={isGenerating || !inputText.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando...
                    </>
                    ) : (
                    <>
                        <SparklesIcon className="w-5 h-5" />
                        Generar y Guardar Lista
                    </>
                    )}
                </button>
            </div>
        </div>
    );
};


interface ChecklistDetailProps {
    list: Checklist;
    onUpdate: (list: Checklist) => void;
    onStartExport: () => void;
    onAddImages: (itemIndex: number, newImages: string[]) => void;
    onDeleteImage: (itemIndex: number, imageIndex: number) => void;
}

const ChecklistDetail: React.FC<ChecklistDetailProps> = ({ list, onUpdate, onStartExport, onAddImages, onDeleteImage }) => {
    const [copySuccess, setCopySuccess] = useState('');
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, itemIndex: null, textBlock: null, isNew: false });
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);
    
    const listRef = useRef(list);
    useEffect(() => {
        listRef.current = list;
    }, [list]);

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const handleToggleItem = useCallback((itemIndex: number) => {
        const currentList = listRef.current;
        const newItems = [...currentList.items];
        newItems[itemIndex].isChecked = !newItems[itemIndex].isChecked;
        onUpdate({ ...currentList, items: newItems });
    }, [onUpdate]);

    const handleTitleChange = useCallback((newTitle: string) => {
        const currentList = listRef.current;
        onUpdate({ ...currentList, title: newTitle });
    }, [onUpdate]);

    const handleOpenAddTextModal = useCallback((itemIndex: number, type: TextBlockType) => {
        setModalState({ 
            isOpen: true, 
            itemIndex,
            textBlock: { id: Date.now().toString(), type, content: '' },
            isNew: true
        });
    }, []);

    const handleOpenEditTextModal = useCallback((itemIndex: number, textBlock: TextBlock) => {
        setModalState({ 
            isOpen: true, 
            itemIndex,
            textBlock: { ...textBlock },
            isNew: false
        });
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalState({ isOpen: false, itemIndex: null, textBlock: null, isNew: false });
    }, []);

    const handleSaveText = useCallback((textBlock: TextBlock) => {
        if (modalState.itemIndex === null) return;
        const currentList = listRef.current;
        const newItems = [...currentList.items];
        const item = newItems[modalState.itemIndex];
        const currentTexts = item.texts || [];
        
        if (modalState.isNew) {
            item.texts = [...currentTexts, textBlock];
        } else {
            item.texts = currentTexts.map(t => t.id === textBlock.id ? textBlock : t);
        }
        
        onUpdate({ ...currentList, items: newItems });
        handleCloseModal();
    }, [onUpdate, handleCloseModal, modalState.itemIndex, modalState.isNew]);
    
    const handleDeleteText = useCallback((itemIndex: number, textBlockId: string) => {
        const currentList = listRef.current;
        const newItems = [...currentList.items];
        const item = newItems[itemIndex];
        item.texts = (item.texts || []).filter(t => t.id !== textBlockId);
        onUpdate({ ...currentList, items: newItems });
    }, [onUpdate]);

    const handleCopyToClipboard = useCallback(() => {
        const currentList = listRef.current;
        if (currentList.items.length === 0) return;
        const textToCopy = currentList.items.map(item => `- [${item.isChecked ? 'x' : ' '}] ${item.text}`).join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
          setCopySuccess('¡Copiado!');
          setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
          setCopySuccess('Error al copiar');
          setTimeout(() => setCopySuccess(''), 2000);
        });
    }, []);
    
    return (
        <div className="h-full flex flex-col">
             {modalState.isOpen && (
                <TextEditModal 
                    textBlock={modalState.textBlock}
                    onSave={handleSaveText}
                    onClose={handleCloseModal}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-2 min-w-0 order-2 sm:order-1 flex-1">
                    {isEditingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            value={list.title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            className="text-xl sm:text-2xl font-bold text-slate-100 bg-slate-700/50 border-2 border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 p-1 w-full"
                        />
                    ) : (
                        <div className="flex items-center gap-2 group min-w-0 flex-1" onClick={() => setIsEditingTitle(true)}>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 truncate cursor-pointer p-1">
                                {list.title}
                            </h2>
                            <button 
                                className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                                aria-label="Editar título"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 order-1 sm:order-2 self-end sm:self-auto">
                    <button
                        onClick={handleCopyToClipboard}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-colors duration-200"
                    >
                        <CopyIcon className="w-4 h-4" />
                        {copySuccess || 'Copiar'}
                    </button>
                    <button
                        onClick={onStartExport}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 transition-colors duration-200"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Exportar
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-lg overflow-y-auto">
              {list.items.length > 0 ? (
                <ul className="space-y-3">
                  {list.items.map((item, index) => (
                    <ChecklistItem 
                      key={index} 
                      item={item}
                      index={index}
                      onToggle={handleToggleItem}
                      onAddImages={onAddImages}
                      onDeleteImage={onDeleteImage}
                      onOpenAddTextModal={handleOpenAddTextModal}
                      onOpenEditTextModal={handleOpenEditTextModal}
                      onDeleteText={handleDeleteText}
                    />
                  ))}
                </ul>
              ) : (
                 <div className="flex items-center justify-center h-full text-slate-500 text-center">
                  <p>Esta lista está vacía.</p>
                </div>
              )}
            </div>
        </div>
    );
};


interface TextEditModalProps {
    textBlock: TextBlock | null;
    onSave: (textBlock: TextBlock) => void;
    onClose: () => void;
}

const TextEditModal: React.FC<TextEditModalProps> = ({ textBlock, onSave, onClose }) => {
    const [content, setContent] = useState(textBlock?.content || '');
    const modalRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSave = () => {
        if (textBlock) {
            onSave({ ...textBlock, content });
        }
    };

    const typeLabels: Record<TextBlockType, string> = {
        title: 'Título',
        subtitle: 'Subtítulo',
        body: 'Párrafo',
        observation: 'Observación'
    }

    if (!textBlock) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                ref={modalRef}
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-xl font-semibold text-slate-100">
                    Editar {typeLabels[textBlock.type]}
                </h3>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`Escribe tu ${typeLabels[textBlock.type].toLowerCase()} aquí...`}
                    className="w-full h-40 p-3 bg-slate-900 border border-slate-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-200 resize-y text-slate-200"
                />
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-slate-300 font-medium rounded-md hover:bg-slate-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ImageObservationModalProps {
    images: string[];
    onClose: () => void;
    onSave: (observations: string[]) => void;
}

const ImageObservationModal: React.FC<ImageObservationModalProps> = ({ images, onClose, onSave }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [observations, setObservations] = useState<string[]>(() => Array(images.length).fill(''));
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        textareaRef.current?.focus();
    }, [currentIndex]);
    
    const handleObservationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newObservations = [...observations];
        newObservations[currentIndex] = e.target.value;
        setObservations(newObservations);
    };

    const handleNext = () => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onSave(observations);
        }
    };
    
    const handleBack = () => {
         if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    }

    const isLastImage = currentIndex === images.length - 1;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg flex flex-col animate-in fade-in-0 zoom-in-95">
                <header className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Añadir Observación</h2>
                    <p className="text-sm text-slate-400">Imagen {currentIndex + 1} de {images.length}</p>
                </header>
                <div className="p-6 space-y-4">
                    <img src={images[currentIndex]} alt={`Preview ${currentIndex + 1}`} className="w-full h-auto max-h-64 object-contain rounded-md bg-slate-900" />
                    <textarea
                        ref={textareaRef}
                        value={observations[currentIndex]}
                        onChange={handleObservationChange}
                        placeholder="Añade una observación para esta imagen (opcional)..."
                        className="w-full h-24 p-3 bg-slate-900 border border-slate-700 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-200 resize-y text-slate-200"
                    />
                </div>
                <footer className="p-4 flex justify-between items-center bg-slate-800/50 border-t border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 font-medium rounded-md hover:bg-slate-700 transition-colors">Cancelar</button>
                    <div className="flex gap-3">
                        <button type="button" onClick={handleBack} disabled={currentIndex === 0} className="px-4 py-2 bg-slate-700 text-slate-300 font-medium rounded-md hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Atrás</button>
                        <button type="button" onClick={handleNext} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors">
                            {isLastImage ? 'Guardar Todas' : 'Siguiente'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};


interface ReportMetadataModalProps {
    listTitle: string;
    onClose: () => void;
    onExport: (metadata: ReportMetadata) => void;
}
const ReportMetadataModal: React.FC<ReportMetadataModalProps> = ({ listTitle, onClose, onExport }) => {
    const [metadata, setMetadata] = useState<ReportMetadata>({
        subject: '', professor: '', team: '',
        date: new Date().toISOString().split('T')[0],
        objective: '', tools: '', safety: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setMetadata({ ...metadata, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onExport(metadata);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col animate-in fade-in-0 zoom-in-95">
                <header className="p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Datos para el Informe PDF</h2>
                    <p className="text-sm text-slate-400">Informe para: "{listTitle}"</p>
                </header>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-slate-300 text-sm">Asignatura / Módulo</span>
                                <input type="text" name="subject" value={metadata.subject} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50" />
                            </label>
                             <label className="block">
                                <span className="text-slate-300 text-sm">Nombre del Profesor</span>
                                <input type="text" name="professor" value={metadata.professor} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50" />
                            </label>
                             <label className="block">
                                <span className="text-slate-300 text-sm">Integrantes del Equipo</span>
                                <input type="text" name="team" value={metadata.team} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50" />
                            </label>
                             <label className="block">
                                <span className="text-slate-300 text-sm">Fecha de Realización</span>
                                <input type="date" name="date" value={metadata.date} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50" />
                            </label>
                        </div>
                        <label className="block">
                            <span className="text-slate-300 text-sm">Objetivo del Trabajo</span>
                            <textarea name="objective" value={metadata.objective} onChange={handleChange} rows={3} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50"></textarea>
                        </label>
                        <label className="block">
                            <span className="text-slate-300 text-sm">Herramientas</span>
                            <input type="text" name="tools" value={metadata.tools} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50" />
                        </label>
                        <label className="block">
                            <span className="text-slate-300 text-sm">Equipo de Seguridad (EPP)</span>
                            <input type="text" name="safety" value={metadata.safety} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border-slate-700 rounded-md shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-500 focus:ring-opacity-50" />
                        </label>
                    </div>
                    <footer className="p-4 flex justify-end gap-3 bg-slate-800/50 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 text-slate-300 font-medium rounded-md hover:bg-slate-600 transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-md hover:bg-sky-500 transition-colors">Generar PDF</button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

interface PdfDesignSelectorModalProps {
    onClose: () => void;
    onSelect: (design: PdfDesign) => void;
}

const PdfDesignSelectorModal: React.FC<PdfDesignSelectorModalProps> = ({ onClose, onSelect }) => {
    const designs: { id: PdfDesign; name: string; description: string }[] = [
        { id: 'moderno', name: 'Moderno', description: 'Diseño limpio con acentos de color azul.' },
        { id: 'clasico', name: 'Clásico', description: 'Formal y tradicional, con fuentes serif.' },
        { id: 'minimalista', name: 'Minimalista', description: 'Simple, en escala de grises y con mucho espacio.' }
    ];

    const ModernoPreview = () => (
        <div className="w-full h-28 bg-slate-700 p-3 rounded border-2 border-slate-600 space-y-2">
            <div className="h-4 bg-sky-500 rounded-sm w-1/2"></div>
            <div className="h-2 bg-slate-500 rounded-sm w-3/4"></div>
            <div className="h-2 bg-slate-500 rounded-sm w-full"></div>
            <div className="h-6 bg-yellow-200/20 rounded-sm w-full mt-1"></div>
        </div>
    );
    const ClasicoPreview = () => (
         <div className="w-full h-28 bg-slate-100 p-3 rounded border-2 border-slate-400 font-serif space-y-2">
            <div className="h-4 bg-slate-800 rounded-sm w-1/2"></div>
            <div className="h-0.5 bg-slate-800 w-1/2"></div>
            <div className="h-2 bg-slate-400 rounded-sm w-3/4 mt-2"></div>
            <div className="h-2 bg-slate-400 rounded-sm w-full mt-1"></div>
        </div>
    );
    const MinimalistaPreview = () => (
         <div className="w-full h-28 bg-white p-3 rounded border-2 border-slate-300 space-y-2">
            <div className="h-4 bg-black rounded-sm w-1/3"></div>
            <div className="h-2 bg-gray-300 rounded-sm w-3/4 mt-3"></div>
            <div className="h-2 bg-gray-300 rounded-sm w-full mt-1"></div>
             <div className="h-2 bg-gray-300 rounded-sm w-2/3 mt-1"></div>
        </div>
    );

    const previews = {
        moderno: <ModernoPreview />,
        clasico: <ClasicoPreview />,
        minimalista: <MinimalistaPreview />,
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col animate-in fade-in-0 zoom-in-95">
                <header className="p-4 border-b border-slate-700 text-center">
                    <h2 className="text-xl font-bold text-slate-100">Elige un Diseño para tu Informe</h2>
                </header>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {designs.map(design => (
                        <div key={design.id} onClick={() => onSelect(design.id)} className="flex flex-col gap-3 p-4 bg-slate-900 rounded-lg border-2 border-slate-700 hover:border-sky-500 cursor-pointer transition-all duration-200">
                            {previews[design.id]}
                            <div className="text-center">
                                <h3 className="font-semibold text-slate-200">{design.name}</h3>
                                <p className="text-xs text-slate-400">{design.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <footer className="p-4 flex justify-end border-t border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 text-slate-300 font-medium rounded-md hover:bg-slate-600 transition-colors">Cancelar</button>
                </footer>
            </div>
        </div>
    );
};

interface SettingsModalProps {
    onClose: () => void;
    onImport: () => Promise<void>;
    onDeleteAll: () => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onImport, onDeleteAll }) => {
    const importInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        setError(null);
        try {
            const lists = await getAllLists();
            const dataStr = JSON.stringify(lists, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            link.download = `checklister_ia_backup_${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Error exporting data", e);
            setError("No se pudieron exportar los datos.");
        }
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("El archivo no se pudo leer.");
                }
                const importedLists = JSON.parse(text);

                if (!Array.isArray(importedLists) || (importedLists.length > 0 && !importedLists.every(l => l.id && l.title && Array.isArray(l.items)))) {
                   throw new Error("El archivo de respaldo tiene un formato inválido.");
                }

                if (window.confirm("¿Estás seguro de que quieres importar estos datos? Se sobrescribirán todas tus listas actuales.")) {
                    await importLists(importedLists);
                    await onImport();
                    onClose();
                }
            } catch (err) {
                console.error("Error importing data", err);
                const message = err instanceof Error ? err.message : "Error desconocido.";
                setError(`Error al importar: ${message}`);
            } finally {
                if (importInputRef.current) importInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleDelete = () => {
        if (window.confirm("¡ADVERTENCIA! ¿Estás seguro de que quieres eliminar TODAS tus listas? Esta acción no se puede deshacer.")) {
             if (window.confirm("Confirmación final: ¿Realmente quieres borrar todo?")) {
                onDeleteAll().then(onClose);
             }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md flex flex-col animate-in fade-in-0 zoom-in-95">
                <header className="p-4 flex justify-between items-center border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Configuración</h2>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><ClearIcon className="w-6 h-6" /></button>
                </header>
                <div className="p-6 space-y-4">
                    {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 p-2 rounded-md">{error}</p>}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-300">Gestión de Datos</h3>
                        <p className="text-sm text-slate-400">
                            Realiza una copia de seguridad de tus listas o importa un archivo existente.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                         <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors">
                            <DownloadCloudIcon className="w-5 h-5" />
                            Exportar
                         </button>
                         <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 transition-colors">
                           <UploadCloudIcon className="w-5 h-5" />
                           Importar
                         </button>
                         <input type="file" ref={importInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-lg font-semibold text-red-400">Zona de Peligro</h3>
                        <p className="text-sm text-slate-400 mb-2">
                           Esta acción es irreversible y eliminará permanentemente todas tus listas.
                        </p>
                        <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 font-semibold rounded-lg hover:bg-red-600/30 border border-red-600/50 transition-colors">
                            <TrashIcon className="w-5 h-5" />
                            Eliminar todos los datos
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UpdateAvailableToast: React.FC<{ onUpdate: () => void }> = ({ onUpdate }) => (
    <div className="fixed bottom-4 right-4 z-50 bg-slate-700 text-white py-3 px-5 rounded-lg shadow-lg flex items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
        <p className="text-sm font-medium">¡Nueva versión disponible!</p>
        <button 
            onClick={onUpdate}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-600 text-white text-sm font-semibold rounded-md hover:bg-sky-500 transition-colors"
        >
            <RefreshCwIcon className="w-4 h-4" />
            Actualizar
        </button>
    </div>
);


export default App;