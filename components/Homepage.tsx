import React, { useState } from 'react';
import { SparklesIcon, YouTubeIcon, TikTokIcon, InstagramIcon, PlayCircleIcon, LightBulbIcon, ScriptIcon, PhotoIcon, MusicNoteIcon, RocketLaunchIcon, UserGroupIcon, ChevronDownIcon, UserCircleIcon } from './Icons';
import LoginModal from './LoginModal';
import { useAppContext } from '../contexts/AppContext';
import LanguageSwitcher from './LanguageSwitcher';

// AI-Generated images embedded as Base64 Data URLs.
const generatedImages = {
    featureBlueprint: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAPDw8QEA8QDw8PDw8PDw8PDw8PDw8PFREBFiARFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0OFQ8QFS0ZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//ABEIAJgBRgMBIgACEQEDEQH/xAAaAAEBAQEBAQEAAAAAAAAAAAAAAwIBBQQG/8QAMBABAQACAAIHBgYDAAAAAAAAAAECEQMEBSExUWFxgaETIjKRscHR4fEUNEFSkv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD9xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADz5M8cePfdVxw4uPnyTPh8vYPHnyxx4t91XHDj4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi3VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2DwZ8sM+KfdVx4MPFyZ8+PnyT0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXxfxRwzfbx1zwX8TfM+HyXcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqFfF/FXHDbbx1zwX8TzM+HyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAV8X8UcM328dc8F/E3zPh8l3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6hXxfxVxw228dc8F/E8zPh8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z`,
    featureScript: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAPDw8QEA8QDw8PDw8PDw8PDw8PDw8PFREBFiARFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0OFQ8QFS0ZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//ABEIAJgBRgMBIgACEQEDEQH/xAAaAAEBAQEBAQEAAAAAAAAAAAAAAwIBBQQG/8QAMBABAQACAAIHBgYDAAAAAAAAAAECEQMEBSExUWFxgaETIjKRscHR4fEUNEFSkv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD9xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADz5M8cePfdVxw4uPnyTPh8vYPHnyxx4t91XHDj4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi3VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2DwZ8sM+KfdVx4MPFyZ8+PnyT0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXxfxRwzfbx1zwX8TfM+HyXcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqFfF/FXHDbbx1zwX8TzM+HyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAV8X8UcM328dc8F/E3zPh8l3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6hXxfxVxw228dc8F/E8zPh8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z`,
    featureAssets: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAPDw8QEA8QDw8PDw8PDw8PDw8PDw8PFREBFiARFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0OFQ8QFS0ZFRkrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrKysrK//ABEIAJgBRgMBIgACEQEDEQH/xAAaAAEBAQEBAQEAAAAAAAAAAAAAAwIBBQQG/8QAMBABAQACAAIHBgYDAAAAAAAAAAECEQMEBSExUWFxgaETIjKRscHR4fEUNEFSkv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD9xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADz5M8cePfdVxw4uPnyTPh8vYPHnyxx4t91XHDj4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2Dx58sceLfdVxw4uPnyTPh8vYPHnyxx4t91XHDi4ufJM2Hy9g8efLHHi33VccOLj58kzYfL2DwZ8sM+KfdVx4MPFyZ8+PnyT0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABXxfxRwzfbx1zwX8TfM+HyXcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqHcX8Tzxzbbx3xw3xTmw+XqFfF/FXHDbbx1zwX8TzM+HyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAV8X8UcM328dc8F/E3zPh8l3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6h3F/E88c228d8cN8U5sPl6hXxfxVxw228dc8F/E8zPh8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z`,
    avatar1: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACbklEQVR4nO2Yy27bQBCGPzHEcaI4/yBDgmwpsmyVNPEH4iBxcICc4Aa4AS4gSZIkyZJOKkVRVDsROw6R1R5LflUqFVT+/2ZmZ8bCQhBCiFtRegAhRB8gAGpW22u1Wi/X6/W76XR62cvl8i+1Wv26XC5/1Ol0r6ZZBDgLhEIhW6vVfl6v19+t1+u/bLfbf4fD4e92u93/jDF2tpmPAlgApmmaX67X63+3Wq3/ttvt/z6fzz/6fP6TRgG0E89ms39bLBa/r9fr/3Q6nf90Op1/0w1g0h6Px39dLBb/ZzKZ/Vkgz/MvGI/Hf14sFv97Mpn8/QzAgIzj+A0Al41Go486ne7tNE2/7wbg31qtxv9fLBb/ZzKZ/J8B+AvIfD5/xmaz+V+9Xv+8XCz+NwxAre90Ou/W63XbZrP5f+L5fD5/brfbH67X6x/GaDT694lGo4/3+/2fS2qgBGDZOY4/zGazUavVWp2m6fNfAbgGcL/fH6zX63/t9XqJJEB9Aczz/Gaj0XgV0LdaLf8LYLVaHa/X6y8A7/f7cR6P/6sBGPDg4zg+z+fzUavV2jRNn/8NwAHAarVardfrn0tqYBgA8/n8wXq9/msiCfy/AvD5fMEY4/f7wRhjzrKs65oG4PH5fD5er9c/bTabbbVabTNN0zcA0jQdAPD5fA3A+/3+02q1/rxcLv+f+3g8/m+1Wg0A8jw/bTab/f8RkbKs6zYA9ff7AQC/39+NaZreBFSr1RoA8/n8xev1+v+MMea6rt/v98dGo/F13W53/3g8/v85z/PfZLVa/bxcLv+30Wh8Xb/f/9/v9/t/2+/3f36/3//fbrfb/v0TQiGE/z8s/wB3x0Sg2pGq8QAAAABJRU5ErkJggg==`,
    avatar2: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACvElEQVR4nO2YzY7bMBCFP0zUJbxy/0GHBDkF5BSElBTcABfgBrgBJGllWVblKAoiiqKdiB37SHUs+ZVCIfj7PTM7M7aQEEKIG1JdACGE7iAA1Kx2t16v3+/3+z9cLpc/LpfLf1qv139dr9f/NM1mE+AsEA6H71YqlX/abDZ/NpvNf2q12n+O4/gHjDHvNoZPAJYAM8/zV1ardf/xePzlarX6R61W+6dxHH+PaYDOM5vN/pFGo/E/ZrOZjDEgjuP/B+Px+M/j8fjXOI4/3w1g4j5N01+lUql/Mpn8f5bL5b8A8zy/rVQq/7xYLH6fAQgCjuP/TqfTvzEej1d+v38cxt+i0Xj2+/2fBGA/McbS6XQ+FosFz+fzUavV/rkDuAkwz/PXarXaD4/H41ar1T8ASZI/h8PhvwB4PJ7/2u/3vw/AnwBcz7qurFar8Xg8nqZpms1m//8C0DQNgIienufz+TAYDEx7vd5gMMjzPBsMBpvNZs/z/L/b7R6/3x/GOMuy/Hq9vlwu/7FarU4mk0Gv17uua0dHRzdu3Lh58+bd3d07OztDoVBERKPR+Hg8nufzvGmasix3Op1er3dd1+/3+z/P8/V6fT6fbmxsunz58uXLly5fvnz58uXrlz58OHz5+PDh48fP3z8+PHz5+uXL16/fv3y5cvnz58uXLly5cvXr9+/fDhw9evXjw4MHR0VEnJydfvXr169evHz58ODo6OlUqkSTJ2dkZADidzs7OsgDwer1e6+rq3t7ebm5uRkdHJycnV69ePTo6enNz8+DBgycnJ6enpycnJ0dHR69fv3748OHj58+fPnz4+Pnz58+fP3/+8uXLly9fvnz58uXLly/fvn378uXLA0VR+L//G/sH9+QyAEYGOK0AAAAASUVORK5CYII=`,
    avatar3: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADwUlEQVR4nO2Za4hVVRQ+58x5z515M+O8jphHNBtRmJFGkRSEJpVB9MFDEET6EBQ9VFBQBB88BUR6KCgIIog+9AHRQ0QRkRSEJkWa+TBGMR1n3jn3nHuP3V1/OHfOnDPnnFmBwz3s2fvss/dae+211y5KqVKlSlW4+gJSpUoVKAABoGa1u51O55vJZP6pVCp/UqnUv65UKn+ZTCbzUzQbAfCCQCaT+aVSqfyn0+l8OptN/rFard8xxph2k/lNAJcAMsuyD4/H47+vVqv/VqvVf1qv1z/HcdzGaQDdZzKZr0ql0v8mk0lGgwFkWR4G4PF4/O/xePwvLMs+2w1g4p/P579are79YrG4z+fz1QCQZVkej8f/uVgs/vsZgCBIkiQAIJ/PZzKZuK7LNE2z2Xw+ny+XywEAc3NzOzs7Nzc3Nzc3s7Ozo6OjbW1tHR0d7e3t/X6/LMtyOp1er3dd17quURT5fD6TySQSiTwej1ar5fP5ZrOZTCZJkqSUyWSCwWAymZw9e/bx48fbt29vbW3dunVrYGBgYGBgYGCAwWCwWCwWi1Gr1VqtdjqdzWaTyWQURfl8vs1mI5FIsiwvLy+fPXt28uTJ8+fPnz9//vz58+fPnz9/8uTJkydPnjx5MpvNZrMZDAaDwWBpaWlqampqampqampqampsbGywWCwWi6dpmmazURRFkiQAEIlEcnJy8uTJkydPnjx58uTJkydPnjx5MplMkiRBEERHRwcAqFarUqkEQMPhcDwenu/n5xMAgMlkAoDVanV0dNTd3d3d3d3Nzc3Nzc2Njo6K+vb2xsbGxsZGr6+vb29vb21tLZVKSZKtjY0AKpVKLpdKpVKDwWAwGAwGg8lkIplMJpPJZrP5fL7P8/V6vSRJgMViIJfLZbPZbDabzWaz2Ww2m81m8/l8nufZbHY8Hq/X63Q6SZJqtdrsdjue5/l8vlgsBoNBIpGA/1/+/xN/AJG7nFw0k/2NAAAAAElFTSuQmCC`,
};

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-700 py-6">
            <dt>
                <button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-start justify-between text-left text-white">
                    <span className="text-base font-semibold leading-7">{question}</span>
                    <span className="ml-6 flex h-7 items-center">
                        <ChevronDownIcon className={`h-6 w-6 transform transition-transform ${isOpen ? '-rotate-180' : 'rotate-0'}`} />
                    </span>
                </button>
            </dt>
            {isOpen && (
                <dd className="mt-2 pr-12">
                    <p className="text-base leading-7 text-gray-300">{answer}</p>
                </dd>
            )}
        </div>
    );
};

const Homepage: React.FC = () => {
    const { t } = useAppContext();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const testimonials = [
        {
            quote: t('homepage.testimonial1_quote'),
            author: t('homepage.testimonial1_author'),
            handle: "@casey_creates",
            avatar: generatedImages.avatar1,
        },
        {
            quote: t('homepage.testimonial2_quote'),
            author: t('homepage.testimonial2_author'),
            handle: "@techtrends_yt",
            avatar: generatedImages.avatar2,
        },
        {
            quote: t('homepage.testimonial3_quote'),
            author: t('homepage.testimonial3_author'),
            handle: "@growthco",
            avatar: generatedImages.avatar3,
        },
    ];
    
    const features = [
        {
            name: t('homepage.feature_blueprint_title'),
            description: t('homepage.feature_blueprint_desc'),
            icon: LightBulbIcon,
            image: generatedImages.featureBlueprint
        },
        {
            name: t('homepage.feature_studio_title'),
            description: t('homepage.feature_studio_desc'),
            icon: ScriptIcon,
            image: generatedImages.featureScript
        },
        {
            name: t('homepage.feature_generative_title'),
            description: t('homepage.feature_generative_desc'),
            icon: PhotoIcon,
            image: generatedImages.featureAssets
        },
        {
            name: t('homepage.feature_autopilot_title'),
            description: t('homepage.feature_autopilot_desc'),
            icon: RocketLaunchIcon,
            image: generatedImages.featureAssets // Placeholder
        },
    ];
    
    const faqs = [
        { question: t('homepage.faq1_q'), answer: t('homepage.faq1_a') },
        { question: t('homepage.faq2_q'), answer: t('homepage.faq2_a') },
        { question: t('homepage.faq3_q'), answer: t('homepage.faq3_a') },
        { question: t('homepage.faq4_q'), answer: t('homepage.faq4_a') },
    ];

    return (
        <div className="bg-gray-900 text-white">
            {/* Abstract Shapes */}
            <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/2 w-[60rem] h-[60rem] rounded-full bg-gradient-to-r from-indigo-600/30 to-purple-600/30 blur-3xl opacity-40" aria-hidden="true" />
            <div className="absolute bottom-[-20rem] right-0 translate-x-1/4 w-[50rem] h-[50rem] rounded-full bg-gradient-to-l from-sky-500/30 to-teal-500/30 blur-3xl opacity-30" aria-hidden="true" />

            <div className="relative isolate">
                <header className="absolute top-0 left-0 right-0 z-10 p-4">
                    <div className="container mx-auto flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <SparklesIcon className="w-8 h-8 text-indigo-500" />
                            <span className="font-bold text-xl">{t('app.name')}</span>
                        </div>
                         <div className="flex items-center space-x-4">
                            <LanguageSwitcher variant="header" />
                            <button
                                onClick={() => setIsLoginModalOpen(true)}
                                className="font-semibold text-white bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-colors"
                            >
                                {t('homepage.login')}
                            </button>
                        </div>
                    </div>
                </header>

                <main>
                    {/* Hero Section */}
                    <section className="relative pt-40 pb-24 text-center">
                        <div className="container mx-auto px-4">
                            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-tight">
                                {t('homepage.title')}
                            </h1>
                            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
                                {t('homepage.subtitle')}
                            </p>
                            <div className="mt-10">
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
                                >
                                    {t('homepage.get_started_free')}
                                </button>
                            </div>

                            <div className="mt-16 w-full max-w-4xl mx-auto">
                                <div 
                                    className="aspect-video bg-black rounded-2xl shadow-2xl shadow-indigo-500/10 border border-white/10 ring-1 ring-white/10 flex items-center justify-center cursor-pointer group bg-cover bg-center"
                                    style={{backgroundImage: `url('${generatedImages.featureBlueprint}')`}}
                                >
                                   <div className="relative w-full h-full flex items-center justify-center backdrop-blur-sm bg-black/30">
                                       <PlayCircleIcon className="w-24 h-24 text-white/70 group-hover:text-white transition-colors duration-300 transform group-hover:scale-110" />
                                   </div>
                                </div>
                            </div>
                        </div>
                    </section>
                    
                     {/* Features Section */}
                    <section className="bg-white/5 py-24 sm:py-32">
                        <div className="container mx-auto px-4">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t('homepage.workflow_title')}</h2>
                                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">{t('homepage.workflow_subtitle')}</p>
                            </div>
                            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {features.map((feature) => (
                                    <div key={feature.name} className="flex flex-col overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700">
                                        <div className="flex-1 p-8">
                                            <div className="bg-indigo-600/20 text-indigo-400 rounded-lg p-3 inline-block">
                                                <feature.icon className="h-8 w-8" aria-hidden="true" />
                                            </div>
                                            <h3 className="mt-6 text-xl font-bold text-white">{feature.name}</h3>
                                            <p className="mt-2 text-gray-400">{feature.description}</p>
                                        </div>
                                         <div className="h-64 bg-gray-900 overflow-hidden">
                                            <img src={feature.image} alt="" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    
                    {/* Testimonial Section */}
                    <section className="bg-gray-900 py-24 sm:py-32">
                        <div className="container mx-auto px-4">
                            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {t('homepage.testimonials_title')}
                            </h2>
                            <div className="mt-16 grid grid-cols-1 gap-8 sm:gap-6 lg:grid-cols-3">
                                {testimonials.map((testimonial, index) => (
                                    <div key={index} className="pt-8 sm:inline-block sm:w-full sm:px-4">
                                        <figure className="rounded-2xl bg-gray-800/80 p-8 text-sm leading-6 backdrop-blur-sm border border-white/10">
                                            <blockquote className="text-gray-300">
                                                <p>“{testimonial.quote}”</p>
                                            </blockquote>
                                            <figcaption className="mt-6 flex items-center gap-x-4">
                                                <img className="h-10 w-10 rounded-full bg-gray-700" src={testimonial.avatar} alt="User avatar"/>
                                                <div>
                                                    <div className="font-semibold text-white">{testimonial.author}</div>
                                                    <div className="text-gray-400">{testimonial.handle}</div>
                                                </div>
                                            </figcaption>
                                        </figure>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    
                     {/* FAQ Section */}
                    <section className="bg-white/5 py-24 sm:py-32">
                        <div className="container mx-auto px-4 max-w-4xl">
                             <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {t('homepage.faq_title')}
                            </h2>
                            <dl className="mt-10 space-y-4">
                                {faqs.map(faq => <FAQItem key={faq.question} {...faq} />)}
                            </dl>
                        </div>
                    </section>

                     {/* Final CTA Section */}
                    <section className="py-24 sm:py-32">
                        <div className="container mx-auto px-4 text-center">
                            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{t('homepage.cta_title')}</h2>
                            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
                                {t('homepage.cta_subtitle')}
                            </p>
                            <div className="mt-10">
                                <button
                                    onClick={() => setIsLoginModalOpen(true)}
                                    className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg shadow-indigo-500/20"
                                >
                                    {t('homepage.cta_button')}
                                </button>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="py-8 border-t border-gray-800">
                    <div className="container mx-auto px-4 text-center text-gray-500">
                        {t('homepage.footer_text', {year: new Date().getFullYear()})}
                    </div>
                </footer>
            </div>
            <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        </div>
    );
};

export default Homepage;