import React from 'react';
import {presentationSlides} from './presentationSlides';

export default function Presentation(){
  return <><h1 className="sr-only">발표</h1><div className="presentation-pages">
    {presentationSlides.map((slide,index)=><img key={slide.src} src={slide.src} width={slide.width} height={slide.height} alt={`발표자료 ${index+1}페이지`} loading={index===0?'eager':'lazy'} decoding="async"/>)}
  </div></>;
}
