interface Headings {
  keyTakeaways: string;
  conclusion: string;
}

const map: Record<string, Headings> = {
  en:      { keyTakeaways: 'Key Takeaways',          conclusion: 'Conclusion' },
  ru:      { keyTakeaways: 'Ключевые выводы',         conclusion: 'Заключение' },
  uk:      { keyTakeaways: 'Ключові висновки',        conclusion: 'Висновок' },
  de:      { keyTakeaways: 'Wichtigste Erkenntnisse', conclusion: 'Fazit' },
  fr:      { keyTakeaways: 'Points clés',             conclusion: 'Conclusion' },
  es:      { keyTakeaways: 'Puntos clave',            conclusion: 'Conclusión' },
  it:      { keyTakeaways: 'Punti chiave',            conclusion: 'Conclusione' },
  pt:      { keyTakeaways: 'Pontos-chave',            conclusion: 'Conclusão' },
  'pt-BR': { keyTakeaways: 'Pontos-chave',            conclusion: 'Conclusão' },
  nl:      { keyTakeaways: 'Belangrijkste punten',    conclusion: 'Conclusie' },
  pl:      { keyTakeaways: 'Główne wnioski',          conclusion: 'Podsumowanie' },
  cs:      { keyTakeaways: 'Klíčové poznatky',        conclusion: 'Závěr' },
  sk:      { keyTakeaways: 'Kľúčové poznatky',        conclusion: 'Záver' },
  hu:      { keyTakeaways: 'Főbb tanulságok',         conclusion: 'Összefoglalás' },
  ro:      { keyTakeaways: 'Concluzii cheie',         conclusion: 'Concluzie' },
  bg:      { keyTakeaways: 'Ключови изводи',          conclusion: 'Заключение' },
  hr:      { keyTakeaways: 'Ključne spoznaje',        conclusion: 'Zaključak' },
  sv:      { keyTakeaways: 'Viktiga punkter',         conclusion: 'Slutsats' },
  da:      { keyTakeaways: 'Vigtige punkter',         conclusion: 'Konklusion' },
  no:      { keyTakeaways: 'Viktige punkter',         conclusion: 'Konklusjon' },
  fi:      { keyTakeaways: 'Tärkeimmät kohdat',       conclusion: 'Johtopäätös' },
  el:      { keyTakeaways: 'Κύρια σημεία',            conclusion: 'Συμπέρασμα' },
  tr:      { keyTakeaways: 'Önemli Noktalar',         conclusion: 'Sonuç' },
  ar:      { keyTakeaways: 'النقاط الرئيسية',         conclusion: 'الخلاصة' },
  he:      { keyTakeaways: 'נקודות מפתח',             conclusion: 'סיכום' },
  hi:      { keyTakeaways: 'मुख्य बिंदु',             conclusion: 'निष्कर्ष' },
  ja:      { keyTakeaways: '重要なポイント',            conclusion: '結論' },
  ko:      { keyTakeaways: '주요 내용',               conclusion: '결론' },
  zh:      { keyTakeaways: '重点摘要',                conclusion: '结论' },
  'zh-Hans': { keyTakeaways: '重点摘要',              conclusion: '结论' },
  'zh-Hant': { keyTakeaways: '重點摘要',              conclusion: '結論' },
  id:      { keyTakeaways: 'Poin Utama',             conclusion: 'Kesimpulan' },
  ms:      { keyTakeaways: 'Poin Utama',             conclusion: 'Kesimpulan' },
  th:      { keyTakeaways: 'ประเด็นสำคัญ',           conclusion: 'บทสรุป' },
  vi:      { keyTakeaways: 'Điểm chính',             conclusion: 'Kết luận' },
};

const fallback: Headings = map['en'];

export function getHeadings(lang: string): Headings {
  return map[lang] ?? map[lang.split('-')[0]] ?? fallback;
}
