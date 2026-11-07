/* PRG Systems – jazyky (překlad rozhraní) + hlasová hlášení + nastavení (Setup) na webu.
   Překládá texty v obrazovce podle slovníku (čeština → zvolený jazyk); co ve slovníku není, zůstane česky.
   Jazyk: localStorage 'prg_lang'. Použití: PRG_I18N.setLang('en'), PRG_I18N.say('wrong_loc'), PRG_SETUP.open() */
(function(){
  if (window.PRG_I18N) return;
  var LANGS = [
    ['cs','Čeština','🇨🇿','cs-CZ'], ['en','English','🇬🇧','en-GB'], ['sk','Slovenčina','🇸🇰','sk-SK'], ['uk','Українська','🇺🇦','uk-UA'],
    ['pl','Polski','🇵🇱','pl-PL'], ['nl','Nederlands','🇳🇱','nl-NL'], ['de','Deutsch','🇩🇪','de-DE'], ['ro','Română','🇷🇴','ro-RO'],
    ['hu','Magyar','🇭🇺','hu-HU'], ['vi','Tiếng Việt','🇻🇳','vi-VN']
  ];
  var ORDER = ['en','sk','uk','pl','nl','de','ro','hu','vi'];
  // čeština | en | sk | uk | pl | nl | de | ro | hu | vi
  var RAW = `
Přihlásit se|Sign in|Prihlásiť sa|Увійти|Zaloguj się|Inloggen|Anmelden|Autentificare|Bejelentkezés|Đăng nhập
Odhlásit se|Sign out|Odhlásiť sa|Вийти|Wyloguj się|Uitloggen|Abmelden|Deconectare|Kijelentkezés|Đăng xuất
Přihlas se pro pokračování.|Sign in to continue.|Prihlás sa pre pokračovanie.|Увійдіть, щоб продовжити.|Zaloguj się, aby kontynuować.|Log in om verder te gaan.|Melde dich an, um fortzufahren.|Autentifică-te pentru a continua.|Jelentkezz be a folytatáshoz.|Đăng nhập để tiếp tục.
Zapomenuté heslo?|Forgot password?|Zabudnuté heslo?|Забули пароль?|Nie pamiętasz hasła?|Wachtwoord vergeten?|Passwort vergessen?|Ai uitat parola?|Elfelejtett jelszó?|Quên mật khẩu?
Vyber, co chceš dělat:|Choose what you want to do:|Vyber, čo chceš robiť:|Виберіть, що хочете робити:|Wybierz, co chcesz zrobić:|Kies wat je wilt doen:|Wähle, was du tun möchtest:|Alege ce vrei să faci:|Válaszd ki, mit szeretnél csinálni:|Chọn việc bạn muốn làm:
Co chceš otevřít?|What do you want to open?|Čo chceš otvoriť?|Що хочете відкрити?|Co chcesz otworzyć?|Wat wil je openen?|Was möchtest du öffnen?|Ce vrei să deschizi?|Mit szeretnél megnyitni?|Bạn muốn mở gì?
Co chceš dělat?|What do you want to do?|Čo chceš robiť?|Що хочете робити?|Co chcesz zrobić?|Wat wil je doen?|Was möchtest du tun?|Ce vrei să faci?|Mit szeretnél csinálni?|Bạn muốn làm gì?
Příjmy, výdeje a skladové operace|Receipts, shipments and warehouse tasks|Príjmy, výdaje a skladové operácie|Приймання, відвантаження та складські операції|Przyjęcia, wydania i operacje magazynowe|Ontvangsten, verzendingen en magazijntaken|Wareneingänge, Ausgänge und Lageraufgaben|Recepții, livrări și operațiuni de depozit|Bevételezés, kiadás és raktári műveletek|Nhập, xuất và thao tác kho
Inventura ze serveru, EAN + lokace, jen EAN, Mezinárodka|Stocktake from server, EAN + location, EAN only, International|Inventúra zo servera, EAN + lokácia, len EAN, Medzinárodka|Інвентаризація з сервера, EAN + локація, лише EAN, Міжнародна|Inwentaryzacja z serwera, EAN + lokalizacja, tylko EAN, Międzynarodowa|Inventaris van server, EAN + locatie, alleen EAN, Internationaal|Inventur vom Server, EAN + Lagerplatz, nur EAN, International|Inventar de pe server, EAN + locație, doar EAN, Internațional|Leltár szerverről, EAN + hely, csak EAN, Nemzetközi|Kiểm kê từ máy chủ, EAN + vị trí, chỉ EAN, Quốc tế
Zákazníci|Customers|Zákazníci|Клієнти|Klienci|Klanten|Kunden|Clienți|Ügyfelek|Khách hàng
Odejít|Leave|Odísť|Вийти|Wyjdź|Verlaten|Verlassen|Ieșire|Kilépés|Thoát
Zpět|Back|Späť|Назад|Wstecz|Terug|Zurück|Înapoi|Vissza|Quay lại
Zavřít|Close|Zavrieť|Закрити|Zamknij|Sluiten|Schließen|Închide|Bezárás|Đóng
Zrušit|Cancel|Zrušiť|Скасувати|Anuluj|Annuleren|Abbrechen|Anulează|Mégse|Hủy
Uložit|Save|Uložiť|Зберегти|Zapisz|Opslaan|Speichern|Salvează|Mentés|Lưu
Potvrdit|Confirm|Potvrdiť|Підтвердити|Potwierdź|Bevestigen|Bestätigen|Confirmă|Megerősítés|Xác nhận
Dokončit|Finish|Dokončiť|Завершити|Zakończ|Voltooien|Abschließen|Finalizează|Befejezés|Hoàn tất
Pokračovat|Continue|Pokračovať|Продовжити|Kontynuuj|Doorgaan|Weiter|Continuă|Tovább|Tiếp tục
Načítám…|Loading…|Načítavam…|Завантаження…|Ładowanie…|Laden…|Lädt…|Se încarcă…|Betöltés…|Đang tải…
Domů|Home|Domov|Додому|Start|Start|Start|Acasă|Kezdőlap|Trang chủ
Start|Start|Štart|Старт|Start|Start|Start|Start|Indítás|Bắt đầu
Stop|Stop|Stop|Стоп|Stop|Stop|Stopp|Stop|Leállítás|Dừng
Reset|Reset|Reset|Скинути|Reset|Reset|Zurücksetzen|Resetare|Visszaállítás|Đặt lại
Menu|Menu|Menu|Меню|Menu|Menu|Menü|Meniu|Menü|Menu
Nastavení|Settings|Nastavenia|Налаштування|Ustawienia|Instellingen|Einstellungen|Setări|Beállítások|Cài đặt
Setup|Setup|Nastavenie|Налаштування|Ustawienia|Instellingen|Einstellungen|Configurare|Beállítás|Thiết lập
Jazyk|Language|Jazyk|Мова|Język|Taal|Sprache|Limbă|Nyelv|Ngôn ngữ
Jazyk a DC|Language and DC|Jazyk a DC|Мова і DC|Język i DC|Taal en DC|Sprache und DC|Limbă și DC|Nyelv és DC|Ngôn ngữ và DC
Jazyk, DC, hlasová hlášení|Language, DC, voice messages|Jazyk, DC, hlasové hlásenia|Мова, DC, голосові повідомлення|Język, DC, komunikaty głosowe|Taal, DC, gesproken meldingen|Sprache, DC, Sprachansagen|Limbă, DC, mesaje vocale|Nyelv, DC, hangüzenetek|Ngôn ngữ, DC, thông báo giọng nói
Distribuční centrum|Distribution centre|Distribučné centrum|Розподільчий центр|Centrum dystrybucyjne|Distributiecentrum|Distributionszentrum|Centru de distribuție|Elosztóközpont|Trung tâm phân phối
Všechna DC|All DCs|Všetky DC|Усі DC|Wszystkie DC|Alle DC's|Alle DCs|Toate DC|Összes DC|Tất cả DC
Změnit DC|Change DC|Zmeniť DC|Змінити DC|Zmień DC|DC wijzigen|DC ändern|Schimbă DC|DC váltása|Đổi DC
Hlasová hlášení chyb|Spoken error messages|Hlasové hlásenia chýb|Голосові повідомлення про помилки|Głosowe komunikaty błędów|Gesproken foutmeldingen|Gesprochene Fehlermeldungen|Mesaje vocale de eroare|Hibák hangos bemondása|Đọc thông báo lỗi
Vyzkoušet hlas|Test voice|Vyskúšať hlas|Перевірити голос|Sprawdź głos|Stem testen|Stimme testen|Testează vocea|Hang kipróbálása|Thử giọng nói
Zvuky|Sounds|Zvuky|Звуки|Dźwięki|Geluiden|Töne|Sunete|Hangok|Âm thanh
Verze|Version|Verzia|Версія|Wersja|Versie|Version|Versiune|Verzió|Phiên bản
Kamera|Camera|Kamera|Камера|Kamera|Camera|Kamera|Cameră|Kamera|Máy ảnh
Čtečka|Scanner|Čítačka|Сканер|Skaner|Scanner|Scanner|Scaner|Olvasó|Máy quét
Kamera vypnuta|Camera off|Kamera vypnutá|Камера вимкнена|Kamera wyłączona|Camera uit|Kamera aus|Cameră oprită|Kamera kikapcsolva|Máy ảnh tắt
Kamera připravena|Camera ready|Kamera pripravená|Камера готова|Kamera gotowa|Camera gereed|Kamera bereit|Cameră pregătită|Kamera kész|Máy ảnh sẵn sàng
Kamera spuštěna|Camera started|Kamera spustená|Камеру запущено|Kamera uruchomiona|Camera gestart|Kamera gestartet|Cameră pornită|Kamera elindítva|Đã bật máy ảnh
Kamera spí|Camera sleeping|Kamera spí|Камера спить|Kamera uśpiona|Camera slaapt|Kamera schläft|Camera doarme|Kamera alszik|Máy ảnh đang ngủ
šetříme baterku|saving battery|šetríme batériu|економимо батарею|oszczędzamy baterię|batterij sparen|Akku wird geschont|economisim bateria|akkumulátor kímélése|tiết kiệm pin
ČTEČKA VYPNUTA|SCANNER OFF|ČÍTAČKA VYPNUTÁ|СКАНЕР ВИМКНЕНО|SKANER WYŁĄCZONY|SCANNER UIT|SCANNER AUS|SCANER OPRIT|OLVASÓ KIKAPCSOLVA|MÁY QUÉT TẮT
ČTEČKA PŘIPRAVENA|SCANNER READY|ČÍTAČKA PRIPRAVENÁ|СКАНЕР ГОТОВИЙ|SKANER GOTOWY|SCANNER GEREED|SCANNER BEREIT|SCANER PREGĂTIT|OLVASÓ KÉSZ|MÁY QUÉT SẴN SÀNG
Čtečka připravena|Scanner ready|Čítačka pripravená|Сканер готовий|Skaner gotowy|Scanner gereed|Scanner bereit|Scaner pregătit|Olvasó kész|Máy quét sẵn sàng
Stiskni ▶ Start|Press ▶ Start|Stlač ▶ Štart|Натисніть ▶ Старт|Naciśnij ▶ Start|Druk op ▶ Start|Drücke ▶ Start|Apasă ▶ Start|Nyomd meg: ▶ Indítás|Nhấn ▶ Bắt đầu
Stiskni spoušť / boční tlačítko čtečky|Press the trigger / side button|Stlač spúšť / bočné tlačidlo čítačky|Натисніть курок / бічну кнопку сканера|Naciśnij spust / boczny przycisk skanera|Druk op de trekker / zijknop|Drücke den Auslöser / die Seitentaste|Apasă trăgaciul / butonul lateral|Nyomd meg a ravaszt / oldalgombot|Nhấn cò / nút bên của máy quét
Čekám na spuštění…|Waiting to start…|Čakám na spustenie…|Очікую запуску…|Czekam na uruchomienie…|Wachten op start…|Warte auf Start…|Aștept pornirea…|Indításra vár…|Đang chờ bắt đầu…
Žádná naskenovaná data|No scanned data|Žiadne naskenované dáta|Немає відсканованих даних|Brak zeskanowanych danych|Geen gescande gegevens|Keine gescannten Daten|Nicio dată scanată|Nincs beolvasott adat|Chưa có dữ liệu quét
Zadat kód ručně…|Enter code manually…|Zadať kód ručne…|Ввести код вручну…|Wpisz kod ręcznie…|Code handmatig invoeren…|Code manuell eingeben…|Introdu codul manual…|Kód kézi megadása…|Nhập mã thủ công…
Kód nejde přečíst – zadat ručně|Code unreadable – enter manually|Kód nejde prečítať – zadať ručne|Код не читається – ввести вручну|Kod nieczytelny – wpisz ręcznie|Code onleesbaar – handmatig invoeren|Code unlesbar – manuell eingeben|Cod ilizibil – introdu manual|A kód olvashatatlan – add meg kézzel|Không đọc được mã – nhập thủ công
SKENOVAT|SCAN|SKENOVAŤ|СКАНУВАТИ|SKANUJ|SCANNEN|SCANNEN|SCANEAZĂ|BEOLVASÁS|QUÉT
SKENOVAT EAN|SCAN EAN|SKENOVAŤ EAN|СКАНУВАТИ EAN|SKANUJ EAN|EAN SCANNEN|EAN SCANNEN|SCANEAZĂ EAN|EAN BEOLVASÁSA|QUÉT EAN
SKENUJ LOKACI|SCAN LOCATION|SKENUJ LOKÁCIU|СКАНУЙТЕ ЛОКАЦІЮ|SKANUJ LOKALIZACJĘ|SCAN LOCATIE|LAGERPLATZ SCANNEN|SCANEAZĂ LOCAȚIA|HELY BEOLVASÁSA|QUÉT VỊ TRÍ
Nejdřív naskenuj LOKACI|Scan the LOCATION first|Najprv naskenuj LOKÁCIU|Спочатку відскануйте ЛОКАЦІЮ|Najpierw zeskanuj LOKALIZACJĘ|Scan eerst de LOCATIE|Zuerst LAGERPLATZ scannen|Scanează mai întâi LOCAȚIA|Először a HELYET olvasd be|Quét VỊ TRÍ trước
naskenuj LOKACI|scan the LOCATION|naskenuj LOKÁCIU|відскануйте ЛОКАЦІЮ|zeskanuj LOKALIZACJĘ|scan de LOCATIE|LAGERPLATZ scannen|scanează LOCAȚIA|olvasd be a HELYET|quét VỊ TRÍ
Lokace: nenastavena|Location: not set|Lokácia: nenastavená|Локація: не задана|Lokalizacja: nieustawiona|Locatie: niet ingesteld|Lagerplatz: nicht gesetzt|Locație: nesetată|Hely: nincs beállítva|Vị trí: chưa đặt
Místnost: nenastavena|Room: not set|Miestnosť: nenastavená|Приміщення: не задано|Pomieszczenie: nieustawione|Ruimte: niet ingesteld|Raum: nicht gesetzt|Cameră: nesetată|Helyiség: nincs beállítva|Phòng: chưa đặt
Mezinárodka|International|Medzinárodka|Міжнародна|Międzynarodowa|Internationaal|International|Internațional|Nemzetközi|Quốc tế
Mezinárodka – slepá inventura|International – blind count|Medzinárodka – slepá inventúra|Міжнародна – сліпа інвентаризація|Międzynarodowa – inwentaryzacja na ślepo|Internationaal – blinde telling|International – Blindinventur|Internațional – inventar orb|Nemzetközi – vak leltár|Quốc tế – kiểm kê mù
Jakou inventuru chceš dělat?|Which stocktake do you want to do?|Akú inventúru chceš robiť?|Яку інвентаризацію хочете робити?|Jaką inwentaryzację chcesz zrobić?|Welke telling wil je doen?|Welche Inventur möchtest du machen?|Ce inventar vrei să faci?|Milyen leltárt szeretnél?|Bạn muốn kiểm kê loại nào?
Inventura ze serveru (seznam)|Stocktake from server (list)|Inventúra zo servera (zoznam)|Інвентаризація з сервера (список)|Inwentaryzacja z serwera (lista)|Telling van server (lijst)|Inventur vom Server (Liste)|Inventar de pe server (listă)|Leltár szerverről (lista)|Kiểm kê từ máy chủ (danh sách)
EAN + lokace|EAN + location|EAN + lokácia|EAN + локація|EAN + lokalizacja|EAN + locatie|EAN + Lagerplatz|EAN + locație|EAN + hely|EAN + vị trí
EAN + Lokace|EAN + Location|EAN + Lokácia|EAN + Локація|EAN + Lokalizacja|EAN + Locatie|EAN + Lagerplatz|EAN + Locație|EAN + Hely|EAN + Vị trí
Jen EAN|EAN only|Len EAN|Лише EAN|Tylko EAN|Alleen EAN|Nur EAN|Doar EAN|Csak EAN|Chỉ EAN
Seznam z Excelu/CSV v zařízení|List from Excel/CSV on device|Zoznam z Excelu/CSV v zariadení|Список з Excel/CSV на пристрої|Lista z Excela/CSV w urządzeniu|Lijst uit Excel/CSV op apparaat|Liste aus Excel/CSV auf dem Gerät|Listă din Excel/CSV pe dispozitiv|Lista Excelből/CSV-ből az eszközön|Danh sách từ Excel/CSV trên máy
Seznamy na serveru|Lists on server|Zoznamy na serveri|Списки на сервері|Listy na serwerze|Lijsten op server|Listen auf dem Server|Liste pe server|Listák a szerveren|Danh sách trên máy chủ
Průša dobalování|Průša repacking|Průša dobaľovanie|Průša допакування|Průša dopakowanie|Průša herverpakken|Průša Nachverpackung|Průša reambalare|Průša utócsomagolás|Průša đóng gói bổ sung
Vyber zákaznickou činnost:|Choose a customer task:|Vyber zákaznícku činnosť:|Виберіть клієнтську операцію:|Wybierz zadanie klienta:|Kies een klanttaak:|Wähle eine Kundenaufgabe:|Alege o activitate pentru client:|Válassz ügyfélfeladatot:|Chọn công việc khách hàng:
Zpět do hlavního rozcestníku|Back to main menu|Späť do hlavného rozcestníka|Назад до головного меню|Powrót do menu głównego|Terug naar hoofdmenu|Zurück zum Hauptmenü|Înapoi la meniul principal|Vissza a főmenübe|Về menu chính
Příjem|Receiving|Príjem|Приймання|Przyjęcie|Ontvangst|Wareneingang|Recepție|Bevételezés|Nhập hàng
Zaskladnění|Putaway|Zaskladnenie|Розміщення|Rozlokowanie|Wegzetten|Einlagerung|Depozitare|Betárolás|Cất hàng
Vychystání|Picking|Vychystanie|Комплектація|Kompletacja|Orderpicken|Kommissionierung|Picking|Komissiózás|Lấy hàng
Balení|Packing|Balenie|Пакування|Pakowanie|Inpakken|Verpacken|Ambalare|Csomagolás|Đóng gói
Nakládka|Loading|Nakládka|Завантаження|Załadunek|Laden|Verladung|Încărcare|Rakodás|Xếp hàng lên xe
Doplnění pick lokací|Pick location replenishment|Doplnenie pick lokácií|Поповнення пік-локацій|Uzupełnianie lokalizacji pick|Aanvullen pickplaatsen|Nachschub Pickplätze|Reaprovizionare locații pick|Pick-helyek feltöltése|Bổ sung vị trí lấy hàng
Cyklická inventura|Cycle count|Cyklická inventúra|Циклічна інвентаризація|Inwentaryzacja cykliczna|Cyclustelling|Permanente Inventur|Inventar ciclic|Ciklikus leltár|Kiểm kê định kỳ
Info lokace / LPN · přesah|Location / LPN info · overhang|Info lokácie / LPN · presah|Інфо локації / LPN · виступ|Info lokalizacji / LPN · nawis|Info locatie / LPN · overstek|Info Lagerplatz / LPN · Überstand|Info locație / LPN · depășire|Hely / LPN infó · túllógás|Thông tin vị trí / LPN · tràn
Tisk štítků / packing listu|Print labels / packing list|Tlač štítkov / packing listu|Друк етикеток / пакувального листа|Drukuj etykiety / listę pakowania|Labels / paklijst printen|Etiketten / Packliste drucken|Tipărire etichete / listă de colete|Címkék / csomaglista nyomtatása|In nhãn / phiếu đóng gói
Yard – vrátnice / rampa|Yard – gate / dock|Yard – vrátnica / rampa|Двір – прохідна / рампа|Plac – brama / rampa|Terrein – poort / dock|Hof – Pforte / Rampe|Curte – poartă / rampă|Udvar – porta / rámpa|Bãi xe – cổng / cửa dock
Kde je zásilka?|Where is the shipment?|Kde je zásielka?|Де вантаж?|Gdzie jest przesyłka?|Waar is de zending?|Wo ist die Sendung?|Unde este expediția?|Hol van a küldemény?|Lô hàng ở đâu?
Výjimka / foto|Exception / photo|Výnimka / foto|Виняток / фото|Wyjątek / zdjęcie|Uitzondering / foto|Ausnahme / Foto|Excepție / foto|Kivétel / fotó|Ngoại lệ / ảnh
Nahlásit výjimku|Report exception|Nahlásiť výnimku|Повідомити виняток|Zgłoś wyjątek|Uitzondering melden|Ausnahme melden|Raportează excepția|Kivétel bejelentése|Báo ngoại lệ
Co se stalo|What happened|Čo sa stalo|Що сталося|Co się stało|Wat is er gebeurd|Was ist passiert|Ce s-a întâmplat|Mi történt|Chuyện gì xảy ra
Popis|Description|Popis|Опис|Opis|Omschrijving|Beschreibung|Descriere|Leírás|Mô tả
Fotky|Photos|Fotky|Фото|Zdjęcia|Foto's|Fotos|Fotografii|Fotók|Ảnh
Závažnost|Severity|Závažnosť|Серйозність|Waga|Ernst|Schweregrad|Gravitate|Súlyosság|Mức độ
Nízká|Low|Nízka|Низька|Niska|Laag|Niedrig|Scăzută|Alacsony|Thấp
Střední|Medium|Stredná|Середня|Średnia|Middel|Mittel|Medie|Közepes|Trung bình
Vysoká|High|Vysoká|Висока|Wysoka|Hoog|Hoch|Ridicată|Magas|Cao
Tiskárna|Printer|Tlačiareň|Принтер|Drukarka|Printer|Drucker|Imprimantă|Nyomtató|Máy in
Co tisknout|What to print|Čo tlačiť|Що друкувати|Co drukować|Wat printen|Was drucken|Ce să tipărești|Mit nyomtassunk|In gì
Kopií|Copies|Kópií|Копій|Kopii|Kopieën|Kopien|Copii|Példány|Bản sao
Tisknout|Print|Tlačiť|Друкувати|Drukuj|Printen|Drucken|Tipărește|Nyomtatás|In
Tisk|Print|Tlač|Друк|Druk|Printen|Drucken|Tipărire|Nyomtatás|In
Kód|Code|Kód|Код|Kod|Code|Code|Cod|Kód|Mã
Položka|Item|Položka|Позиція|Pozycja|Artikel|Artikel|Articol|Tétel|Mặt hàng
Stav|Status|Stav|Статус|Status|Status|Status|Stare|Állapot|Trạng thái
Umístění|Location|Umiestnenie|Розміщення|Lokalizacja|Locatie|Lagerort|Locație|Hely|Vị trí
Lokace|Location|Lokácia|Локація|Lokalizacja|Locatie|Lagerplatz|Locație|Hely|Vị trí
Množství|Quantity|Množstvo|Кількість|Ilość|Aantal|Menge|Cantitate|Mennyiség|Số lượng
Klient|Client|Klient|Клієнт|Klient|Klant|Kunde|Client|Ügyfél|Khách hàng
Klienti|Clients|Klienti|Клієнти|Klienci|Klanten|Kunden|Clienți|Ügyfelek|Khách hàng
Datum|Date|Dátum|Дата|Data|Datum|Datum|Dată|Dátum|Ngày
Číslo|Number|Číslo|Номер|Numer|Nummer|Nummer|Număr|Szám|Số
Dodavatel|Supplier|Dodávateľ|Постачальник|Dostawca|Leverancier|Lieferant|Furnizor|Szállító|Nhà cung cấp
Kdo|Who|Kto|Хто|Kto|Wie|Wer|Cine|Ki|Ai
Kdy|When|Kedy|Коли|Kiedy|Wanneer|Wann|Când|Mikor|Khi nào
Název|Name|Názov|Назва|Nazwa|Naam|Name|Nume|Név|Tên
Akce|Actions|Akcie|Дії|Akcje|Acties|Aktionen|Acțiuni|Műveletek|Thao tác
Stáhnout|Download|Stiahnuť|Завантажити|Pobierz|Downloaden|Herunterladen|Descarcă|Letöltés|Tải xuống
Smazat|Delete|Zmazať|Видалити|Usuń|Verwijderen|Löschen|Șterge|Törlés|Xóa
Upravit|Edit|Upraviť|Редагувати|Edytuj|Bewerken|Bearbeiten|Editează|Szerkesztés|Sửa
Hledat|Search|Hľadať|Пошук|Szukaj|Zoeken|Suchen|Caută|Keresés|Tìm kiếm
Obnovit|Refresh|Obnoviť|Оновити|Odśwież|Vernieuwen|Aktualisieren|Reîmprospătează|Frissítés|Làm mới
Všechny|All|Všetky|Усі|Wszystkie|Alle|Alle|Toate|Összes|Tất cả
Vše|All|Všetko|Усе|Wszystko|Alles|Alle|Tot|Mind|Tất cả
Nový|New|Nový|Новий|Nowy|Nieuw|Neu|Nou|Új|Mới
Hotovo|Done|Hotovo|Готово|Gotowe|Klaar|Erledigt|Gata|Kész|Xong
Dokončeno|Completed|Dokončené|Завершено|Zakończone|Voltooid|Abgeschlossen|Finalizat|Befejezve|Đã hoàn tất
Zrušená|Cancelled|Zrušená|Скасована|Anulowana|Geannuleerd|Storniert|Anulată|Törölve|Đã hủy
Aktivní|Active|Aktívna|Активна|Aktywna|Actief|Aktiv|Activă|Aktív|Đang hoạt động
Druh|Type|Druh|Тип|Rodzaj|Soort|Art|Tip|Típus|Loại
Nalezeno|Found|Nájdené|Знайдено|Znaleziono|Gevonden|Gefunden|Găsit|Megtalálva|Đã tìm thấy
Chybí|Missing|Chýba|Бракує|Brakuje|Ontbreekt|Fehlt|Lipsă|Hiányzik|Thiếu
Přebývá|Surplus|Prebýva|Надлишок|Nadwyżka|Overschot|Überschuss|Surplus|Többlet|Dư
Kdo dokončil|Finished by|Kto dokončil|Хто завершив|Kto zakończył|Voltooid door|Abgeschlossen von|Finalizat de|Befejezte|Người hoàn tất
Dokončené a zrušené inventury|Finished and cancelled stocktakes|Dokončené a zrušené inventúry|Завершені та скасовані інвентаризації|Zakończone i anulowane inwentaryzacje|Voltooide en geannuleerde tellingen|Abgeschlossene und stornierte Inventuren|Inventare finalizate și anulate|Befejezett és törölt leltárak|Kiểm kê đã xong và đã hủy
Zobrazit|Show|Zobraziť|Показати|Pokaż|Toon|Anzeigen|Afișează|Megjelenítés|Hiển thị
Předchozí|Previous|Predchádzajúca|Попередня|Poprzednia|Vorige|Zurück|Anterior|Előző|Trước
Další|Next|Ďalšia|Наступна|Następna|Volgende|Weiter|Următor|Következő|Tiếp
Příjmy|Receipts|Príjmy|Приймання|Przyjęcia|Ontvangsten|Wareneingänge|Recepții|Bevételezések|Phiếu nhập
Výdeje|Shipments|Výdaje|Відвантаження|Wydania|Verzendingen|Warenausgänge|Livrări|Kiadások|Phiếu xuất
Zásoby|Stock|Zásoby|Запаси|Zapasy|Voorraad|Bestand|Stoc|Készlet|Tồn kho
Obsazenost|Occupancy|Obsadenosť|Заповненість|Zajętość|Bezetting|Belegung|Grad de ocupare|Kihasználtság|Mức lấp đầy
Přesnost zásob|Stock accuracy|Presnosť zásob|Точність запасів|Dokładność zapasów|Voorraadnauwkeurigheid|Bestandsgenauigkeit|Acuratețea stocului|Készletpontosság|Độ chính xác tồn kho
Historie|History|História|Історія|Historia|Geschiedenis|Verlauf|Istoric|Előzmények|Lịch sử
Skeny|Scans|Skeny|Скани|Skany|Scans|Scans|Scanări|Beolvasások|Lượt quét
Výjimky|Exceptions|Výnimky|Винятки|Wyjątki|Uitzonderingen|Ausnahmen|Excepții|Kivételek|Ngoại lệ
Fakturace|Billing|Fakturácia|Виставлення рахунків|Fakturowanie|Facturatie|Abrechnung|Facturare|Számlázás|Hóa đơn
Šablony tisku|Print templates|Šablóny tlače|Шаблони друку|Szablony wydruku|Printsjablonen|Druckvorlagen|Șabloane de tipărire|Nyomtatási sablonok|Mẫu in
Integrace|Integrations|Integrácie|Інтеграції|Integracje|Integraties|Integrationen|Integrări|Integrációk|Tích hợp
Nastavení systému|System settings|Nastavenia systému|Системні налаштування|Ustawienia systemu|Systeeminstellingen|Systemeinstellungen|Setări sistem|Rendszerbeállítások|Cài đặt hệ thống
Uživatelé|Users|Používatelia|Користувачі|Użytkownicy|Gebruikers|Benutzer|Utilizatori|Felhasználók|Người dùng
Monitoring teplot|Temperature monitoring|Monitoring teplôt|Моніторинг температури|Monitoring temperatury|Temperatuurbewaking|Temperaturüberwachung|Monitorizare temperatură|Hőmérséklet-figyelés|Giám sát nhiệt độ
Sklad, klienti, příjmy, výdeje|Warehouse, clients, receipts, shipments|Sklad, klienti, príjmy, výdaje|Склад, клієнти, приймання, відвантаження|Magazyn, klienci, przyjęcia, wydania|Magazijn, klanten, ontvangsten, verzendingen|Lager, Kunden, Eingänge, Ausgänge|Depozit, clienți, recepții, livrări|Raktár, ügyfelek, bevételezés, kiadás|Kho, khách hàng, nhập, xuất
Seznamy majetku a výsledky inventur|Asset lists and stocktake results|Zoznamy majetku a výsledky inventúr|Списки майна та результати інвентаризацій|Listy majątku i wyniki inwentaryzacji|Activalijsten en telresultaten|Inventarlisten und Inventurergebnisse|Liste de active și rezultate inventar|Vagyonlisták és leltáreredmények|Danh sách tài sản và kết quả kiểm kê
Čidla, alarmy, reporty (GDP)|Sensors, alarms, reports (GDP)|Čidlá, alarmy, reporty (GDP)|Датчики, тривоги, звіти (GDP)|Czujniki, alarmy, raporty (GDP)|Sensoren, alarmen, rapporten (GDP)|Sensoren, Alarme, Berichte (GDP)|Senzori, alarme, rapoarte (GDP)|Érzékelők, riasztások, jelentések (GDP)|Cảm biến, cảnh báo, báo cáo (GDP)
Retrak simulátor|Reach truck simulator|Retrak simulátor|Симулятор річтрака|Symulator wózka wysokiego składowania|Reachtruck-simulator|Schubmaststapler-Simulator|Simulator stivuitor|Tolóoszlopos targonca szimulátor|Mô phỏng xe nâng reach truck
Simulace provozu haly a retraků|Simulation of hall and reach trucks|Simulácia prevádzky haly a retrakov|Симуляція роботи складу та річтраків|Symulacja pracy hali i wózków|Simulatie van hal en reachtrucks|Simulation von Halle und Staplern|Simularea halei și a stivuitoarelor|Csarnok és targoncák szimulációja|Mô phỏng hoạt động kho và xe nâng
Připojení a odesílání|Connection and sending|Pripojenie a odosielanie|З'єднання та надсилання|Połączenie i wysyłanie|Verbinding en verzenden|Verbindung und Senden|Conexiune și trimitere|Kapcsolat és küldés|Kết nối và gửi
Odeslat teď|Send now|Odoslať teraz|Надіслати зараз|Wyślij teraz|Nu verzenden|Jetzt senden|Trimite acum|Küldés most|Gửi ngay
Načíst nejnovější verzi scanneru|Load the latest scanner version|Načítať najnovšiu verziu skenera|Завантажити останню версію сканера|Wczytaj najnowszą wersję skanera|Nieuwste scannerversie laden|Neueste Scanner-Version laden|Încarcă cea mai nouă versiune|A legújabb verzió betöltése|Tải phiên bản mới nhất
Dokončit inventuru?|Finish stocktake?|Dokončiť inventúru?|Завершити інвентаризацію?|Zakończyć inwentaryzację?|Telling voltooien?|Inventur abschließen?|Finalizezi inventarul?|Befejezed a leltárt?|Hoàn tất kiểm kê?
Ukončit inventuru?|End stocktake?|Ukončiť inventúru?|Закінчити інвентаризацію?|Zakończyć inwentaryzację?|Telling beëindigen?|Inventur beenden?|Închei inventarul?|Lezárod a leltárt?|Kết thúc kiểm kê?
Zpět ke skenování|Back to scanning|Späť ku skenovaniu|Назад до сканування|Wróć do skanowania|Terug naar scannen|Zurück zum Scannen|Înapoi la scanare|Vissza a beolvasáshoz|Quay lại quét
Pokračovat v rozjeté|Continue the running one|Pokračovať v rozbehnutej|Продовжити розпочату|Kontynuuj rozpoczętą|Doorgaan met lopende|Laufende fortsetzen|Continuă cea începută|A folyamatban lévő folytatása|Tiếp tục phiên đang chạy
Jiná lokace|Different location|Iná lokácia|Інша локація|Inna lokalizacja|Andere locatie|Anderer Lagerplatz|Altă locație|Másik hely|Vị trí khác
Neznámý kód|Unknown code|Neznámy kód|Невідомий код|Nieznany kod|Onbekende code|Unbekannter Code|Cod necunoscut|Ismeretlen kód|Mã không xác định
Položka již existuje|Item already exists|Položka už existuje|Позиція вже існує|Pozycja już istnieje|Artikel bestaat al|Artikel existiert bereits|Articolul există deja|A tétel már létezik|Mặt hàng đã tồn tại
Režim skenování|Scan mode|Režim skenovania|Режим сканування|Tryb skanowania|Scanmodus|Scanmodus|Mod de scanare|Beolvasási mód|Chế độ quét
Distribuční centrum|Distribution centre|Distribučné centrum|Розподільчий центр|Centrum dystrybucyjne|Distributiecentrum|Distributionszentrum|Centru de distribuție|Elosztóközpont|Trung tâm phân phối
Vyber DC, ve kterém právě pracuješ.|Choose the DC you are working in.|Vyber DC, v ktorom práve pracuješ.|Виберіть DC, у якому працюєте.|Wybierz DC, w którym pracujesz.|Kies het DC waar je werkt.|Wähle das DC, in dem du arbeitest.|Alege DC-ul în care lucrezi.|Válaszd ki a DC-t, ahol dolgozol.|Chọn DC bạn đang làm việc.
Nastavit jako moje výchozí DC|Set as my default DC|Nastaviť ako moje predvolené DC|Зробити моїм DC за замовчуванням|Ustaw jako moje domyślne DC|Instellen als mijn standaard-DC|Als mein Standard-DC festlegen|Setează ca DC implicit|Beállítás alapértelmezett DC-ként|Đặt làm DC mặc định
Online|Online|Online|Онлайн|Online|Online|Online|Online|Online|Trực tuyến
Offline|Offline|Offline|Офлайн|Offline|Offline|Offline|Offline|Offline|Ngoại tuyến
Zapnuto|On|Zapnuté|Увімкнено|Włączone|Aan|An|Pornit|Be|Bật
Vypnuto|Off|Vypnuté|Вимкнено|Wyłączone|Uit|Aus|Oprit|Ki|Tắt
Úlohy WMS|WMS tasks|Úlohy WMS|Завдання WMS|Zadania WMS|WMS-taken|WMS-Aufgaben|Sarcini WMS|WMS feladatok|Tác vụ WMS
Inventura ze serveru|Stocktake from server|Inventúra zo servera|Інвентаризація з сервера|Inwentaryzacja z serwera|Telling van server|Inventur vom Server|Inventar de pe server|Leltár szerverről|Kiểm kê từ máy chủ
Mezinárodka (seznam i slepá)|International (list and blind)|Medzinárodka (zoznam aj slepá)|Міжнародна (список і сліпа)|Międzynarodowa (lista i na ślepo)|Internationaal (lijst en blind)|International (Liste und blind)|Internațional (listă și orb)|Nemzetközi (lista és vak)|Quốc tế (danh sách và mù)
Ostatní|Other|Ostatné|Інше|Inne|Overig|Sonstiges|Altele|Egyéb|Khác
Hlášení zapnout pro|Enable messages for|Hlásenia zapnúť pre|Увімкнути повідомлення для|Włącz komunikaty dla|Meldingen aan voor|Ansagen aktivieren für|Activează mesajele pentru|Üzenetek bekapcsolása|Bật thông báo cho
Hub|Hub|Hub|Хаб|Hub|Hub|Hub|Hub|Hub|Trung tâm
Žádná data k exportu|No data to export|Žiadne dáta na export|Немає даних для експорту|Brak danych do eksportu|Geen gegevens om te exporteren|Keine Daten zum Export|Nicio dată de exportat|Nincs exportálható adat|Không có dữ liệu để xuất
Inventura zrušena|Stocktake cancelled|Inventúra zrušená|Інвентаризацію скасовано|Inwentaryzacja anulowana|Telling geannuleerd|Inventur storniert|Inventar anulat|Leltár törölve|Đã hủy kiểm kê
Inventura ukončena|Stocktake finished|Inventúra ukončená|Інвентаризацію завершено|Inwentaryzacja zakończona|Telling afgerond|Inventur beendet|Inventar încheiat|Leltár lezárva|Đã kết thúc kiểm kê
Zrušeno|Cancelled|Zrušené|Скасовано|Anulowano|Geannuleerd|Abgebrochen|Anulat|Megszakítva|Đã hủy
Neplatný počet|Invalid quantity|Neplatný počet|Невірна кількість|Nieprawidłowa ilość|Ongeldig aantal|Ungültige Menge|Cantitate invalidă|Érvénytelen mennyiség|Số lượng không hợp lệ
klepni na Start a vyber činnost|tap Start and choose a task|klepni na Štart a vyber činnosť|натисніть Старт і виберіть дію|naciśnij Start i wybierz zadanie|tik op Start en kies een taak|tippe auf Start und wähle eine Aufgabe|apasă Start și alege activitatea|koppints az Indításra és válassz feladatot|nhấn Bắt đầu và chọn công việc
vyber činnost|choose a task|vyber činnosť|виберіть дію|wybierz zadanie|kies een taak|wähle eine Aufgabe|alege activitatea|válassz feladatot|chọn công việc
Naskenuj lokaci nebo LPN|Scan location or LPN|Naskenuj lokáciu alebo LPN|Відскануйте локацію або LPN|Zeskanuj lokalizację lub LPN|Scan locatie of LPN|Lagerplatz oder LPN scannen|Scanează locația sau LPN|Olvasd be a helyet vagy LPN-t|Quét vị trí hoặc LPN
Naskenuj LPN palety|Scan the pallet LPN|Naskenuj LPN palety|Відскануйте LPN палети|Zeskanuj LPN palety|Scan de pallet-LPN|Paletten-LPN scannen|Scanează LPN-ul paletului|Olvasd be a raklap LPN-jét|Quét LPN của pallet
Naskenuj EAN produktu|Scan the product EAN|Naskenuj EAN produktu|Відскануйте EAN товару|Zeskanuj EAN produktu|Scan de product-EAN|Produkt-EAN scannen|Scanează EAN-ul produsului|Olvasd be a termék EAN-ját|Quét EAN sản phẩm
Skenuj palety / zboží na lokaci|Scan pallets / goods at the location|Skenuj palety / tovar na lokácii|Скануйте палети / товар на локації|Skanuj palety / towar w lokalizacji|Scan pallets / goederen op de locatie|Paletten / Ware am Platz scannen|Scanează paleții / marfa din locație|Olvasd be a raklapokat / árut a helyen|Quét pallet / hàng tại vị trí
Naskenuj obaly / palety při nakládce|Scan packages / pallets when loading|Naskenuj obaly / palety pri nakládke|Скануйте упаковки / палети під час завантаження|Skanuj opakowania / palety przy załadunku|Scan colli / pallets bij het laden|Packstücke / Paletten beim Verladen scannen|Scanează coletele / paleții la încărcare|Olvasd be a csomagokat / raklapokat rakodáskor|Quét kiện / pallet khi xếp hàng
Uloženo v zařízení – odešle se po připojení|Saved on device – will be sent when online|Uložené v zariadení – odošle sa po pripojení|Збережено на пристрої – надішлеться після з'єднання|Zapisano w urządzeniu – wyśle się po połączeniu|Opgeslagen op apparaat – wordt verzonden zodra online|Auf dem Gerät gespeichert – wird online gesendet|Salvat pe dispozitiv – se trimite la conectare|Az eszközön mentve – kapcsolatkor elküldjük|Đã lưu trên máy – sẽ gửi khi có mạng
CSV exportováno|CSV exported|CSV exportované|CSV експортовано|CSV wyeksportowano|CSV geëxporteerd|CSV exportiert|CSV exportat|CSV exportálva|Đã xuất CSV
Vše vychystáno – potvrď odeslání|All picked – confirm dispatch|Všetko vychystané – potvrď odoslanie|Усе скомплектовано – підтвердіть відправлення|Wszystko skompletowane – potwierdź wysyłkę|Alles gepickt – bevestig verzending|Alles kommissioniert – Versand bestätigen|Totul pregătit – confirmă expedierea|Minden komissiózva – erősítsd meg a kiadást|Đã lấy đủ – xác nhận gửi
Stiskni spoušť čtečky (boční tlačítko)|Press the scanner trigger (side button)|Stlač spúšť čítačky (bočné tlačidlo)|Натисніть курок сканера (бічна кнопка)|Naciśnij spust skanera (przycisk boczny)|Druk op de scannertrekker (zijknop)|Scanner-Auslöser drücken (Seitentaste)|Apasă trăgaciul scanerului (buton lateral)|Nyomd meg az olvasó ravaszát (oldalgomb)|Nhấn cò máy quét (nút bên)
Zadej EAN ručně…|Enter EAN manually…|Zadaj EAN ručne…|Введіть EAN вручну…|Wpisz EAN ręcznie…|EAN handmatig invoeren…|EAN manuell eingeben…|Introdu EAN manual…|EAN kézi megadása…|Nhập EAN thủ công…
Zvuky zapnuty|Sounds on|Zvuky zapnuté|Звуки увімкнено|Dźwięki włączone|Geluid aan|Töne an|Sunete pornite|Hangok bekapcsolva|Đã bật âm thanh
Zvuky vypnuty|Sounds off|Zvuky vypnuté|Звуки вимкнено|Dźwięki wyłączone|Geluid uit|Töne aus|Sunete oprite|Hangok kikapcsolva|Đã tắt âm thanh
Hlasová hlášení zapnuta|Voice messages on|Hlasové hlásenia zapnuté|Голосові повідомлення увімкнено|Komunikaty głosowe włączone|Gesproken meldingen aan|Sprachansagen an|Mesaje vocale pornite|Hangüzenetek bekapcsolva|Đã bật thông báo giọng nói
Hlasová hlášení vypnuta|Voice messages off|Hlasové hlásenia vypnuté|Голосові повідомлення вимкнено|Komunikaty głosowe wyłączone|Gesproken meldingen uit|Sprachansagen aus|Mesaje vocale oprite|Hangüzenetek kikapcsolva|Đã tắt thông báo giọng nói
Zvuky a vibrace|Sounds and vibration|Zvuky a vibrácie|Звуки та вібрація|Dźwięki i wibracje|Geluid en trillen|Töne und Vibration|Sunete și vibrații|Hangok és rezgés|Âm thanh và rung
Hlášení zapnout pro:|Enable messages for:|Hlásenia zapnúť pre:|Увімкнути повідомлення для:|Włącz komunikaty dla:|Meldingen aan voor:|Ansagen aktivieren für:|Activează mesajele pentru:|Üzenetek bekapcsolása:|Bật thông báo cho:
Ukládám…|Saving…|Ukladám…|Зберігаю…|Zapisuję…|Opslaan…|Speichere…|Se salvează…|Mentés…|Đang lưu…
Dokončená|Finished|Dokončená|Завершена|Zakończona|Voltooid|Abgeschlossen|Finalizată|Befejezett|Đã xong
Nahrané inventury|Uploaded stocktakes|Nahrané inventúry|Завантажені інвентаризації|Wgrane inwentaryzacje|Geüploade tellingen|Hochgeladene Inventuren|Inventare încărcate|Feltöltött leltárak|Kiểm kê đã tải lên
Aktivní inventury|Active stocktakes|Aktívne inventúry|Активні інвентаризації|Aktywne inwentaryzacje|Actieve tellingen|Aktive Inventuren|Inventare active|Aktív leltárak|Kiểm kê đang chạy
Položek|Items|Položiek|Позицій|Pozycji|Artikelen|Positionen|Articole|Tételek|Số mục
Vytvořeno|Created|Vytvorené|Створено|Utworzono|Aangemaakt|Erstellt|Creat|Létrehozva|Đã tạo
Postup|Progress|Postup|Прогрес|Postęp|Voortgang|Fortschritt|Progres|Haladás|Tiến độ
Spuštěno|Started|Spustené|Запущено|Uruchomiono|Gestart|Gestartet|Pornit|Elindítva|Đã bắt đầu
Kdo skenuje|Who is scanning|Kto skenuje|Хто сканує|Kto skanuje|Wie scant|Wer scannt|Cine scanează|Ki olvas be|Ai đang quét
Žádné inventury čekající na spuštění|No stocktakes waiting to start|Žiadne inventúry čakajúce na spustenie|Немає інвентаризацій, що очікують запуску|Brak inwentaryzacji oczekujących na start|Geen tellingen die wachten op start|Keine Inventuren warten auf Start|Niciun inventar în așteptare|Nincs indításra váró leltár|Không có kiểm kê chờ bắt đầu
Právě nikdo neskenuje|Nobody is scanning right now|Práve nikto neskenuje|Зараз ніхто не сканує|Nikt teraz nie skanuje|Er scant nu niemand|Gerade scannt niemand|Nimeni nu scanează acum|Most senki sem olvas be|Hiện không ai đang quét
Zrušit filtry|Clear filters|Zrušiť filtre|Скинути фільтри|Wyczyść filtry|Filters wissen|Filter zurücksetzen|Șterge filtrele|Szűrők törlése|Xóa bộ lọc
Oživit|Revive|Oživiť|Відновити|Przywróć|Heropenen|Wiederbeleben|Reactivează|Újraindítás|Khôi phục
Inventura|Stocktake|Inventúra|Інвентаризація|Inwentaryzacja|Telling|Inventur|Inventar|Leltár|Kiểm kê
Filtru nic neodpovídá|Nothing matches the filter|Filtru nič nezodpovedá|Нічого не відповідає фільтру|Nic nie pasuje do filtra|Niets voldoet aan het filter|Nichts entspricht dem Filter|Nimic nu corespunde filtrului|Semmi sem felel meg a szűrőnek|Không có kết quả phù hợp
Zatím žádné dokončené inventury|No finished stocktakes yet|Zatiaľ žiadne dokončené inventúry|Ще немає завершених інвентаризацій|Brak zakończonych inwentaryzacji|Nog geen voltooide tellingen|Noch keine abgeschlossenen Inventuren|Încă niciun inventar finalizat|Még nincs befejezett leltár|Chưa có kiểm kê hoàn tất
Stáří zásilek ve skladu|Age of shipments in stock|Vek zásielok na sklade|Вік вантажів на складі|Wiek przesyłek w magazynie|Ouderdom van zendingen|Alter der Sendungen im Lager|Vechimea expedițiilor în depozit|Küldemények kora a raktárban|Tuổi lô hàng trong kho
Živě|Live|Naživo|Наживо|Na żywo|Live|Live|Live|Élő|Trực tiếp
Hledat…|Search…|Hľadať…|Пошук…|Szukaj…|Zoeken…|Suchen…|Caută…|Keresés…|Tìm kiếm…
Uložit nové heslo|Save new password|Uložiť nové heslo|Зберегти новий пароль|Zapisz nowe hasło|Nieuw wachtwoord opslaan|Neues Passwort speichern|Salvează parola nouă|Új jelszó mentése|Lưu mật khẩu mới
`;
  var DICT = {}, LOWER = {};
  RAW.split('\n').forEach(function(l){
    var p = l.split('|'); if (p.length < 10) return;
    var k = p[0].trim(); DICT[k] = {}; ORDER.forEach(function(lg, i){ DICT[k][lg] = p[i + 1].trim(); });
    LOWER[k.toLowerCase()] = k;
  });

  // hlasová hlášení
  var VOICE = {
    wrong_loc:    ['Špatná lokace','Wrong location','Zlá lokácia','Неправильна локація','Zła lokalizacja','Verkeerde locatie','Falscher Lagerplatz','Locație greșită','Rossz hely','Sai vị trí'],
    not_in_list:  ['Není v seznamu','Not on the list','Nie je v zozname','Немає у списку','Nie ma na liście','Staat niet op de lijst','Nicht in der Liste','Nu este în listă','Nincs a listán','Không có trong danh sách'],
    unknown_code: ['Kód neexistuje','Code does not exist','Kód neexistuje','Код не існує','Kod nie istnieje','Code bestaat niet','Code existiert nicht','Codul nu există','A kód nem létezik','Mã không tồn tại'],
    bad_format:   ['Špatný formát kódu','Wrong code format','Zlý formát kódu','Неправильний формат коду','Zły format kodu','Verkeerd codeformaat','Falsches Codeformat','Format de cod greșit','Hibás kódformátum','Sai định dạng mã'],
    dest_code:    ['Kód destinace, naskenuj horní kód','Destination code, scan the top code','Kód destinácie, naskenuj horný kód','Код призначення, скануйте верхній код','Kod miejsca docelowego, zeskanuj górny kod','Bestemmingscode, scan de bovenste code','Zielcode, oberen Code scannen','Cod de destinație, scanează codul de sus','Célkód, olvasd be a felső kódot','Mã điểm đến, hãy quét mã phía trên'],
    duplicate:    ['Už naskenováno','Already scanned','Už naskenované','Вже відскановано','Już zeskanowano','Al gescand','Bereits gescannt','Deja scanat','Már beolvasva','Đã quét rồi'],
    scan_location:['Nejdřív naskenuj lokaci','Scan the location first','Najprv naskenuj lokáciu','Спочатку відскануйте локацію','Najpierw zeskanuj lokalizację','Scan eerst de locatie','Zuerst Lagerplatz scannen','Scanează mai întâi locația','Először a helyet olvasd be','Hãy quét vị trí trước'],
    too_many:     ['Kus navíc','Extra piece','Kus navyše','Зайва одиниця','Sztuka nadmiarowa','Extra stuk','Stück zu viel','Bucată în plus','Többlet darab','Thừa một kiện'],
    wrong_item:   ['Špatná položka','Wrong item','Zlá položka','Неправильна позиція','Zła pozycja','Verkeerd artikel','Falscher Artikel','Articol greșit','Rossz tétel','Sai mặt hàng'],
    not_expected: ['Neočekávaný kód','Unexpected code','Neočakávaný kód','Неочікуваний код','Nieoczekiwany kod','Onverwachte code','Unerwarteter Code','Cod neașteptat','Nem várt kód','Mã không mong đợi'],
    print_fail:   ['Tisk selhal','Print failed','Tlač zlyhala','Помилка друку','Drukowanie nie powiodło się','Printen mislukt','Druck fehlgeschlagen','Tipărirea a eșuat','Nyomtatás sikertelen','In thất bại'],
    error:        ['Chyba','Error','Chyba','Помилка','Błąd','Fout','Fehler','Eroare','Hiba','Lỗi'],
    test:         ['Hlasová hlášení jsou zapnutá','Voice messages are on','Hlasové hlásenia sú zapnuté','Голосові повідомлення увімкнено','Komunikaty głosowe są włączone','Gesproken meldingen staan aan','Sprachansagen sind aktiv','Mesajele vocale sunt pornite','A hangüzenetek bekapcsolva','Thông báo giọng nói đã bật']
  };
  var CODES = ['cs'].concat(ORDER);

  var lang = 'cs';
  try { lang = localStorage.getItem('prg_lang') || 'cs'; } catch(e) {}
  if (CODES.indexOf(lang) < 0) lang = 'cs';

  var LETTER = /[A-Za-zÀ-žА-яЁёІіЇїЄєҐґ0-9]/;
  function core(seg){
    var i = 0, j = seg.length;
    while (i < j && !LETTER.test(seg[i])) i++;
    while (j > i && /[\s.:,…!?–\-]/.test(seg[j - 1]) && !(seg[j - 1] === '…' && DICT[seg.slice(i, j)])) j--;
    return [seg.slice(0, i), seg.slice(i, j), seg.slice(j)];
  }
  function lookup(k){
    if (DICT[k]) return DICT[k][lang];
    var lk = LOWER[k.toLowerCase()];
    if (lk) { var v = DICT[lk][lang]; return k === k.toUpperCase() && k !== k.toLowerCase() ? v.toUpperCase() : v; }
    return null;
  }
  function tr(s){
    if (lang === 'cs' || !s) return s;
    var t = s.trim(); if (!t) return s;
    var lead = s.slice(0, s.indexOf(t)), tail = s.slice(s.indexOf(t) + t.length);
    var full = core(t), f = full[1] && lookup(full[1]);
    if (!f) { var pre = full[0], rest = t.slice(pre.length), g = rest && lookup(rest); if (g) return lead + pre + g + tail; }
    if (f) return lead + full[0] + f + full[2] + tail;
    if (t.indexOf(' · ') < 0) return s;
    var parts = t.split(' · '), hit = false;
    parts = parts.map(function(p){ var c = core(p), v = c[1] && lookup(c[1]); if (v) { hit = true; return c[0] + v + c[2]; } var r = p.slice(c[0].length), w = r && lookup(r); if (w) { hit = true; return c[0] + w; } return p; });
    return hit ? lead + parts.join(' · ') + tail : s;
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1 };
  var busy = false;
  function doText(n){
    var cur = n.nodeValue;
    if (n.__i18nOut === cur) return;        // náš vlastní překlad
    n.__i18nSrc = cur;
    var out = tr(cur);
    n.__i18nOut = out;
    if (out !== cur) n.nodeValue = out;
  }
  function doEl(el){
    ['placeholder', 'title', 'aria-label'].forEach(function(a){
      if (!el.hasAttribute || !el.hasAttribute(a)) return;
      var cur = el.getAttribute(a), key = '__i18n_' + a;
      if (el[key + 'Out'] === cur) return;
      el[key] = cur; var out = tr(cur); el[key + 'Out'] = out; if (out !== cur) el.setAttribute(a, out);
    });
  }
  function walk(root){
    if (!root) return;
    if (root.nodeType === 3) { var p = root.parentNode; if (p && !SKIP[p.nodeName] && !(p.closest && p.closest('[data-noi18n]'))) doText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || root.hasAttribute('data-noi18n')) return;
    doEl(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){ if (n.nodeType === 1 && (SKIP[n.nodeName] || n.hasAttribute('data-noi18n'))) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
    var n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function restore(root){
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (n.__i18nSrc != null && n.__i18nOut === n.nodeValue) n.nodeValue = n.__i18nSrc; n.__i18nOut = null; }
      else ['placeholder', 'title', 'aria-label'].forEach(function(a){ var k = '__i18n_' + a; if (n[k] != null && n[k + 'Out'] === n.getAttribute(a)) n.setAttribute(a, n[k]); n[k + 'Out'] = null; });
    }
  }
  var obs = null;
  function observe(){
    if (obs || !window.MutationObserver || !document.body) return;
    obs = new MutationObserver(function(muts){
      if (lang === 'cs' || busy) return;
      busy = true;
      try {
        muts.forEach(function(m){
          if (m.type === 'characterData') walk(m.target);
          else if (m.type === 'attributes') doEl(m.target);
          else m.addedNodes.forEach(function(n){ walk(n); });
        });
      } finally { busy = false; }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
  }
  function apply(){
    if (!document.body) return;
    document.documentElement.setAttribute('lang', lang);
    busy = true;
    try { restore(document.body); if (lang !== 'cs') walk(document.body); } finally { busy = false; }
    observe();
  }
  function setLang(l){
    if (CODES.indexOf(l) < 0) l = 'cs';
    lang = l; try { localStorage.setItem('prg_lang', l); } catch(e) {}
    apply();
    try { window.dispatchEvent(new CustomEvent('prg-lang', { detail: l })); } catch(e) {}
  }

  // hlas
  var lastSay = { k: '', t: 0 };
  function voiceText(key){ var v = VOICE[key] || VOICE.error; return v[CODES.indexOf(lang)] || v[0]; }
  function say(key){
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
    var now = Date.now(); if (lastSay.k === key && now - lastSay.t < 1200) return true;   // neopakovat při rychlém skenování
    lastSay = { k: key, t: now };
    try {
      var u = new SpeechSynthesisUtterance(voiceText(key)), bcp = LANGS[CODES.indexOf(lang)][3];
      u.lang = bcp; u.rate = 1.05;
      var vs = speechSynthesis.getVoices() || [], v = vs.find(function(x){ return x.lang && x.lang.toLowerCase().replace('_', '-') === bcp.toLowerCase(); }) || vs.find(function(x){ return x.lang && x.lang.slice(0, 2).toLowerCase() === lang; });
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      return true;
    } catch(e) { return false; }
  }
  function hasVoice(l){
    var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    return vs.some(function(x){ return x.lang && x.lang.slice(0, 2).toLowerCase() === (l || lang); });
  }
  // rozpoznání druhu chyby z textu hlášení (scanner)
  function classify(text){
    var s = String(text || '').toLowerCase();
    if (/destinace/.test(s)) return 'dest_code';
    if (/špatná lokace|máš být na|máš jít na|cíl je|jiná lokace/.test(s)) return 'wrong_loc';
    if (/naskenuj lokaci/.test(s)) return 'scan_location';
    if (/už bylo naskenováno|už je v sadě|už naskenov|duplic/.test(s)) return 'duplicate';
    if (/není v seznamu|v seznamu není|není v exportu|nepatří|mimo seznam/.test(s)) return 'not_in_list';
    if (/musí začínat|formát/.test(s)) return 'bad_format';
    if (/kus navíc|přebýv/.test(s)) return 'too_many';
    if (/není lpn|není .*sku|nemá$| sku \/ ean nemá/.test(s)) return 'wrong_item';
    if (/nečeká|žádná úloha|nic takového|není otevřená/.test(s)) return 'not_expected';
    if (/neexistuje|nenalezen|taková lokace ani|nikde nenalezeno|nemá/.test(s)) return 'unknown_code';
    if (/tisk selhal/.test(s)) return 'print_fail';
    return null;
  }

  window.PRG_I18N = { LANGS: LANGS, get lang(){ return lang; }, setLang: setLang, t: tr, apply: apply, say: say, voiceText: voiceText, classify: classify, hasVoice: hasVoice, VOICE_KEYS: Object.keys(VOICE) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  if (window.speechSynthesis) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function(){}; } catch(e) {} }

  // ── Setup na webu (jazyk + DC) ──
  function esc(v){ return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  async function openSetup(){
    var old = document.getElementById('prg-setup'); if (old) old.remove();
    var curDc = ''; try { curDc = localStorage.getItem('prg_dc') || ''; } catch(e) {}
    var list = [];
    if (window.PRG_DC && PRG_DC.list().length) list = PRG_DC.list();
    else if (window.supa) { try { var r = await supa.from('warehouses').select('id,code,name,is_active').order('code'); list = (r.data || []).filter(function(w){ return w.is_active !== false; }); } catch(e) {} }
    var m = document.createElement('div'); m.id = 'prg-setup';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,32,.45);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = '<div style="background:#fff;border-radius:14px;width:100%;max-width:520px;max-height:90vh;overflow:auto;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:inherit;color:#1c2430">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:18px">⚙️ Setup</h3><button type="button" id="prg-setup-x" aria-label="Zavřít" style="border:none;background:#eef1f4;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px">✕</button></div>'
      + '<div style="font-size:12px;font-weight:700;color:#5b6672;text-transform:uppercase;margin:16px 0 6px">Jazyk</div>'
      + '<div id="prg-setup-langs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px">'
      + LANGS.map(function(L){ return '<button type="button" data-l="' + L[0] + '" style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:9px;border:1.5px solid ' + (L[0] === lang ? '#0a7c4e' : '#dfe4ea') + ';background:' + (L[0] === lang ? '#e7f4ee' : '#fff') + ';cursor:pointer;font:inherit;font-size:14px;font-weight:600;text-align:left"><span style="font-size:18px">' + L[2] + '</span>' + L[1] + '</button>'; }).join('')
      + '</div><div style="font-size:12px;color:#5b6672;margin-top:6px" data-noi18n>Překlad se postupně doplňuje – co ještě přeložené není, zůstane česky. / Untranslated texts stay in Czech.</div>'
      + '<div style="font-size:12px;font-weight:700;color:#5b6672;text-transform:uppercase;margin:16px 0 6px">Distribuční centrum</div>'
      + (list.length ? '<select id="prg-setup-dc" style="width:100%;padding:10px;border:1.5px solid #dfe4ea;border-radius:9px;font:inherit;font-size:14px">' + (list.length > 1 ? '<option value="">Všechna DC</option>' : '') + list.map(function(w){ return '<option value="' + esc(w.id) + '"' + (String(w.id) === curDc ? ' selected' : '') + '>' + esc(w.code) + ' – ' + esc(w.name || '') + '</option>'; }).join('') + '</select>' : '<div style="font-size:13px;color:#5b6672">Po přihlášení.</div>')
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px"><button type="button" id="prg-setup-ok" style="padding:10px 18px;border-radius:9px;border:none;background:#0a7c4e;color:#fff;font:inherit;font-weight:700;cursor:pointer">Uložit</button></div></div>';
    document.body.appendChild(m);
    var pick = lang;
    m.querySelectorAll('[data-l]').forEach(function(b){ b.onclick = function(){ pick = b.getAttribute('data-l'); m.querySelectorAll('[data-l]').forEach(function(x){ var on = x === b; x.style.borderColor = on ? '#0a7c4e' : '#dfe4ea'; x.style.background = on ? '#e7f4ee' : '#fff'; }); }; });
    m.querySelector('#prg-setup-x').onclick = function(){ m.remove(); };
    m.onclick = function(e){ if (e.target === m) m.remove(); };
    m.querySelector('#prg-setup-ok').onclick = function(){
      var sel = m.querySelector('#prg-setup-dc'), dcChanged = false;
      if (sel) { dcChanged = sel.value !== curDc; try { localStorage.setItem('prg_dc', sel.value); } catch(e) {} }
      m.remove();
      if (pick !== lang) setLang(pick);
      if (dcChanged) window.location.reload();
    };
    if (lang !== 'cs') walk(m);
  }
  window.PRG_SETUP = { open: openSetup };
})();
