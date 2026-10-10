/* ملفّ مولَّد — لا تعدّله بيدك.
 * المصدر: Core/Sources/AsiaCupCore/Resources/schedule.json و Teams.swift
 * لإعادة توليده: python3 AsiaCup2027/tools/regen-schedule-data.py
 *
 * توقيتات الانطلاق غير معلَنة من الاتحاد الآسيوي بعد، فـkickoffUTC=null
 * ويُحسب قفل مبدئي آمن من التاريخ. انظر rules.js و app.js.
 */
(function (root) {
  var DATA = {
   "expectedMatchCount": 51,
   "tournamentStart": "2027-01-07",
   "tournamentEnd": "2027-02-05",
   "provisionalLockUTCHour": 9,
   "teams": {
    "Saudi Arabia": {
     "ar": "السعودية",
     "code": "sa",
     "group": "A"
    },
    "Kuwait": {
     "ar": "الكويت",
     "code": "kw",
     "group": "A"
    },
    "Oman": {
     "ar": "عُمان",
     "code": "om",
     "group": "A"
    },
    "Palestine": {
     "ar": "فلسطين",
     "code": "ps",
     "group": "A"
    },
    "Uzbekistan": {
     "ar": "أوزبكستان",
     "code": "uz",
     "group": "B"
    },
    "Bahrain": {
     "ar": "البحرين",
     "code": "bh",
     "group": "B"
    },
    "North Korea": {
     "ar": "كوريا الشمالية",
     "code": "kp",
     "group": "B"
    },
    "Jordan": {
     "ar": "الأردن",
     "code": "jo",
     "group": "B"
    },
    "Iran": {
     "ar": "إيران",
     "code": "ir",
     "group": "C"
    },
    "Syria": {
     "ar": "سوريا",
     "code": "sy",
     "group": "C"
    },
    "Kyrgyzstan": {
     "ar": "قيرغيزستان",
     "code": "kg",
     "group": "C"
    },
    "China": {
     "ar": "الصين",
     "code": "cn",
     "group": "C"
    },
    "Australia": {
     "ar": "أستراليا",
     "code": "au",
     "group": "D"
    },
    "Tajikistan": {
     "ar": "طاجيكستان",
     "code": "tj",
     "group": "D"
    },
    "Iraq": {
     "ar": "العراق",
     "code": "iq",
     "group": "D"
    },
    "Singapore": {
     "ar": "سنغافورة",
     "code": "sg",
     "group": "D"
    },
    "South Korea": {
     "ar": "كوريا الجنوبية",
     "code": "kr",
     "group": "E"
    },
    "United Arab Emirates": {
     "ar": "الإمارات",
     "code": "ae",
     "group": "E"
    },
    "Vietnam": {
     "ar": "فيتنام",
     "code": "vn",
     "group": "E"
    },
    "Yemen": {
     "ar": "اليمن",
     "code": "ye",
     "group": "E"
    },
    "Japan": {
     "ar": "اليابان",
     "code": "jp",
     "group": "F"
    },
    "Qatar": {
     "ar": "قطر",
     "code": "qa",
     "group": "F"
    },
    "Thailand": {
     "ar": "تايلاند",
     "code": "th",
     "group": "F"
    },
    "Indonesia": {
     "ar": "إندونيسيا",
     "code": "id",
     "group": "F"
    }
   },
   "matches": [
    {
     "id": "m1",
     "n": 1,
     "stage": "group",
     "group": "A",
     "home": "Saudi Arabia",
     "away": "Palestine",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-07",
     "kickoffUTC": null
    },
    {
     "id": "m2",
     "n": 2,
     "stage": "group",
     "group": "A",
     "home": "Kuwait",
     "away": "Oman",
     "venue": "استاد جامعة الملك سعود",
     "city": "الرياض",
     "date": "2027-01-08",
     "kickoffUTC": null
    },
    {
     "id": "m3",
     "n": 3,
     "stage": "group",
     "group": "B",
     "home": "Bahrain",
     "away": "North Korea",
     "venue": "استاد جامعة الإمام محمد بن سعود",
     "city": "الرياض",
     "date": "2027-01-08",
     "kickoffUTC": null
    },
    {
     "id": "m4",
     "n": 4,
     "stage": "group",
     "group": "B",
     "home": "Uzbekistan",
     "away": "Jordan",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-08",
     "kickoffUTC": null
    },
    {
     "id": "m5",
     "n": 5,
     "stage": "group",
     "group": "C",
     "home": "Syria",
     "away": "Kyrgyzstan",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-09",
     "kickoffUTC": null
    },
    {
     "id": "m6",
     "n": 6,
     "stage": "group",
     "group": "C",
     "home": "Iran",
     "away": "China",
     "venue": "أرينا المملكة",
     "city": "الرياض",
     "date": "2027-01-09",
     "kickoffUTC": null
    },
    {
     "id": "m7",
     "n": 7,
     "stage": "group",
     "group": "D",
     "home": "Australia",
     "away": "Singapore",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-01-09",
     "kickoffUTC": null
    },
    {
     "id": "m8",
     "n": 8,
     "stage": "group",
     "group": "D",
     "home": "Tajikistan",
     "away": "Iraq",
     "venue": "استاد الشباب",
     "city": "الرياض",
     "date": "2027-01-10",
     "kickoffUTC": null
    },
    {
     "id": "m9",
     "n": 9,
     "stage": "group",
     "group": "E",
     "home": "South Korea",
     "away": "Yemen",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-10",
     "kickoffUTC": null
    },
    {
     "id": "m10",
     "n": 10,
     "stage": "group",
     "group": "E",
     "home": "United Arab Emirates",
     "away": "Vietnam",
     "venue": "استاد جامعة الملك سعود",
     "city": "الرياض",
     "date": "2027-01-11",
     "kickoffUTC": null
    },
    {
     "id": "m11",
     "n": 11,
     "stage": "group",
     "group": "F",
     "home": "Qatar",
     "away": "Thailand",
     "venue": "استاد جامعة الإمام محمد بن سعود",
     "city": "الرياض",
     "date": "2027-01-11",
     "kickoffUTC": null
    },
    {
     "id": "m12",
     "n": 12,
     "stage": "group",
     "group": "F",
     "home": "Japan",
     "away": "Indonesia",
     "venue": "استاد مدينة الأمير عبدالله الفيصل الرياضية",
     "city": "جدة",
     "date": "2027-01-11",
     "kickoffUTC": null
    },
    {
     "id": "m13",
     "n": 13,
     "stage": "group",
     "group": "A",
     "home": "Oman",
     "away": "Saudi Arabia",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-12",
     "kickoffUTC": null
    },
    {
     "id": "m14",
     "n": 14,
     "stage": "group",
     "group": "B",
     "home": "North Korea",
     "away": "Uzbekistan",
     "venue": "أرينا المملكة",
     "city": "الرياض",
     "date": "2027-01-12",
     "kickoffUTC": null
    },
    {
     "id": "m15",
     "n": 15,
     "stage": "group",
     "group": "A",
     "home": "Palestine",
     "away": "Kuwait",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-01-12",
     "kickoffUTC": null
    },
    {
     "id": "m16",
     "n": 16,
     "stage": "group",
     "group": "C",
     "home": "Kyrgyzstan",
     "away": "Iran",
     "venue": "استاد الشباب",
     "city": "الرياض",
     "date": "2027-01-13",
     "kickoffUTC": null
    },
    {
     "id": "m17",
     "n": 17,
     "stage": "group",
     "group": "B",
     "home": "Jordan",
     "away": "Bahrain",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-13",
     "kickoffUTC": null
    },
    {
     "id": "m18",
     "n": 18,
     "stage": "group",
     "group": "D",
     "home": "Iraq",
     "away": "Australia",
     "venue": "استاد جامعة الملك سعود",
     "city": "الرياض",
     "date": "2027-01-14",
     "kickoffUTC": null
    },
    {
     "id": "m19",
     "n": 19,
     "stage": "group",
     "group": "D",
     "home": "Singapore",
     "away": "Tajikistan",
     "venue": "استاد جامعة الإمام محمد بن سعود",
     "city": "الرياض",
     "date": "2027-01-14",
     "kickoffUTC": null
    },
    {
     "id": "m20",
     "n": 20,
     "stage": "group",
     "group": "C",
     "home": "China",
     "away": "Syria",
     "venue": "استاد مدينة الأمير عبدالله الفيصل الرياضية",
     "city": "جدة",
     "date": "2027-01-14",
     "kickoffUTC": null
    },
    {
     "id": "m21",
     "n": 21,
     "stage": "group",
     "group": "E",
     "home": "Yemen",
     "away": "United Arab Emirates",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-15",
     "kickoffUTC": null
    },
    {
     "id": "m22",
     "n": 22,
     "stage": "group",
     "group": "E",
     "home": "Vietnam",
     "away": "South Korea",
     "venue": "أرينا المملكة",
     "city": "الرياض",
     "date": "2027-01-15",
     "kickoffUTC": null
    },
    {
     "id": "m23",
     "n": 23,
     "stage": "group",
     "group": "F",
     "home": "Thailand",
     "away": "Japan",
     "venue": "استاد الشباب",
     "city": "الرياض",
     "date": "2027-01-16",
     "kickoffUTC": null
    },
    {
     "id": "m24",
     "n": 24,
     "stage": "group",
     "group": "F",
     "home": "Indonesia",
     "away": "Qatar",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-01-16",
     "kickoffUTC": null
    },
    {
     "id": "m25",
     "n": 25,
     "stage": "group",
     "group": "A",
     "home": "Oman",
     "away": "Palestine",
     "venue": "استاد جامعة الملك سعود",
     "city": "الرياض",
     "date": "2027-01-17",
     "kickoffUTC": null
    },
    {
     "id": "m26",
     "n": 26,
     "stage": "group",
     "group": "B",
     "home": "North Korea",
     "away": "Jordan",
     "venue": "استاد جامعة الإمام محمد بن سعود",
     "city": "الرياض",
     "date": "2027-01-17",
     "kickoffUTC": null
    },
    {
     "id": "m27",
     "n": 27,
     "stage": "group",
     "group": "A",
     "home": "Saudi Arabia",
     "away": "Kuwait",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-17",
     "kickoffUTC": null
    },
    {
     "id": "m28",
     "n": 28,
     "stage": "group",
     "group": "B",
     "home": "Uzbekistan",
     "away": "Bahrain",
     "venue": "استاد مدينة الأمير عبدالله الفيصل الرياضية",
     "city": "جدة",
     "date": "2027-01-17",
     "kickoffUTC": null
    },
    {
     "id": "m29",
     "n": 29,
     "stage": "group",
     "group": "C",
     "home": "Iran",
     "away": "Syria",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-18",
     "kickoffUTC": null
    },
    {
     "id": "m30",
     "n": 30,
     "stage": "group",
     "group": "C",
     "home": "Kyrgyzstan",
     "away": "China",
     "venue": "أرينا المملكة",
     "city": "الرياض",
     "date": "2027-01-18",
     "kickoffUTC": null
    },
    {
     "id": "m31",
     "n": 31,
     "stage": "group",
     "group": "D",
     "home": "Australia",
     "away": "Tajikistan",
     "venue": "استاد الشباب",
     "city": "الرياض",
     "date": "2027-01-19",
     "kickoffUTC": null
    },
    {
     "id": "m32",
     "n": 32,
     "stage": "group",
     "group": "D",
     "home": "Iraq",
     "away": "Singapore",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-01-19",
     "kickoffUTC": null
    },
    {
     "id": "m33",
     "n": 33,
     "stage": "group",
     "group": "E",
     "home": "South Korea",
     "away": "United Arab Emirates",
     "venue": "استاد جامعة الملك سعود",
     "city": "الرياض",
     "date": "2027-01-20",
     "kickoffUTC": null
    },
    {
     "id": "m34",
     "n": 34,
     "stage": "group",
     "group": "F",
     "home": "Japan",
     "away": "Qatar",
     "venue": "استاد جامعة الإمام محمد بن سعود",
     "city": "الرياض",
     "date": "2027-01-20",
     "kickoffUTC": null
    },
    {
     "id": "m35",
     "n": 35,
     "stage": "group",
     "group": "F",
     "home": "Thailand",
     "away": "Indonesia",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-20",
     "kickoffUTC": null
    },
    {
     "id": "m36",
     "n": 36,
     "stage": "group",
     "group": "E",
     "home": "Vietnam",
     "away": "Yemen",
     "venue": "استاد مدينة الأمير عبدالله الفيصل الرياضية",
     "city": "جدة",
     "date": "2027-01-20",
     "kickoffUTC": null
    },
    {
     "id": "m37",
     "n": 37,
     "stage": "R16",
     "group": null,
     "home": "2A",
     "away": "2C",
     "venue": "أرينا المملكة",
     "city": "الرياض",
     "date": "2027-01-22",
     "kickoffUTC": null
    },
    {
     "id": "m38",
     "n": 38,
     "stage": "R16",
     "group": null,
     "home": "1B",
     "away": "3ACD",
     "venue": "استاد الشباب",
     "city": "الرياض",
     "date": "2027-01-22",
     "kickoffUTC": null
    },
    {
     "id": "m39",
     "n": 39,
     "stage": "R16",
     "group": null,
     "home": "1D",
     "away": "3BEF",
     "venue": "استاد جامعة الإمام محمد بن سعود",
     "city": "الرياض",
     "date": "2027-01-23",
     "kickoffUTC": null
    },
    {
     "id": "m40",
     "n": 40,
     "stage": "R16",
     "group": null,
     "home": "1A",
     "away": "3CDE",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-01-23",
     "kickoffUTC": null
    },
    {
     "id": "m41",
     "n": 41,
     "stage": "R16",
     "group": null,
     "home": "1F",
     "away": "2E",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-24",
     "kickoffUTC": null
    },
    {
     "id": "m42",
     "n": 42,
     "stage": "R16",
     "group": null,
     "home": "2B",
     "away": "2F",
     "venue": "استاد مدينة الأمير عبدالله الفيصل الرياضية",
     "city": "جدة",
     "date": "2027-01-24",
     "kickoffUTC": null
    },
    {
     "id": "m43",
     "n": 43,
     "stage": "R16",
     "group": null,
     "home": "1E",
     "away": "2D",
     "venue": "استاد جامعة الملك سعود",
     "city": "الرياض",
     "date": "2027-01-25",
     "kickoffUTC": null
    },
    {
     "id": "m44",
     "n": 44,
     "stage": "R16",
     "group": null,
     "home": "1C",
     "away": "3ABF",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-25",
     "kickoffUTC": null
    },
    {
     "id": "m45",
     "n": 45,
     "stage": "QF",
     "group": null,
     "home": "W37",
     "away": "W39",
     "venue": "أرينا المملكة",
     "city": "الرياض",
     "date": "2027-01-28",
     "kickoffUTC": null
    },
    {
     "id": "m46",
     "n": 46,
     "stage": "QF",
     "group": null,
     "home": "W38",
     "away": "W41",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-01-28",
     "kickoffUTC": null
    },
    {
     "id": "m47",
     "n": 47,
     "stage": "QF",
     "group": null,
     "home": "W44",
     "away": "W43",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-01-29",
     "kickoffUTC": null
    },
    {
     "id": "m48",
     "n": 48,
     "stage": "QF",
     "group": null,
     "home": "W40",
     "away": "W42",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-01-29",
     "kickoffUTC": null
    },
    {
     "id": "m49",
     "n": 49,
     "stage": "SF",
     "group": null,
     "home": "W45",
     "away": "W46",
     "venue": "استاد أرامكو",
     "city": "الخبر",
     "date": "2027-02-01",
     "kickoffUTC": null
    },
    {
     "id": "m50",
     "n": 50,
     "stage": "SF",
     "group": null,
     "home": "W47",
     "away": "W48",
     "venue": "استاد مدينة الملك عبدالله الرياضية",
     "city": "جدة",
     "date": "2027-02-02",
     "kickoffUTC": null
    },
    {
     "id": "m51",
     "n": 51,
     "stage": "FINAL",
     "group": null,
     "home": "W49",
     "away": "W50",
     "venue": "استاد مدينة الملك فهد الرياضية",
     "city": "الرياض",
     "date": "2027-02-05",
     "kickoffUTC": null
    }
   ]
  };
  if (typeof module === 'object' && module.exports) module.exports = DATA;
  else root.ASIA_SCHEDULE = DATA;
})(typeof self !== 'undefined' ? self : this);
