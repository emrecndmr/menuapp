import { database as db, storage } from './firebase.js';
import { ref, set, push, onValue, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Temel veri yapıları
class Tarif {
    constructor(id, isim, kategori, zorluk, hazirlamaSuresi, puan, denenmis = false) {
        this.id = id;
        this.isim = isim;
        this.kategori = kategori;
        this.zorluk = zorluk;
        this.hazirlamaSuresi = hazirlamaSuresi;
        this.puan = puan;
        this.denenmis = denenmis;
        this.malzemeler = [];
        this.talimatlar = [];
    }
}

class Menu {
    constructor(id, isim) {
        this.id = id;
        this.isim = isim;
        this.tarifler = [];
    }
}

// Kategori sabitleri
const KATEGORILER = {
    KAHVALTI: 'Kahvaltı',
    ATISTIRMALIK: 'Atıştırmalık',
    ANA_YEMEK: 'Ana Yemek',
    CORBA: 'Çorba',
    MEZE: 'Meze',
    SALATA: 'Salata',
    TATLI: 'Tatlı',
    ICECEK: 'İçecek',
    FAST_FOOD: 'Fast Food'
};

// Firebase referanslarını al
const db = window.firebaseDatabase;
const storage = window.firebaseStorage;

// Uygulama yönetimi
class YemekPlanlamaUygulamasi {
    constructor() {
        this.tarifler = [];
        this.menuler = [];
        this.haftalikPlan = {
            pazartesi: { kahvalti: null, ogle: null, aksam: null },
            sali: { kahvalti: null, ogle: null, aksam: null },
            carsamba: { kahvalti: null, ogle: null, aksam: null },
            persembe: { kahvalti: null, ogle: null, aksam: null },
            cuma: { kahvalti: null, ogle: null, aksam: null },
            cumartesi: { kahvalti: null, ogle: null, aksam: null },
            pazar: { kahvalti: null, ogle: null, aksam: null }
        };
        this.tariflerRef = ref(db, 'tarifler');
        this.init();
    }

    async init() {
        this.kategorileriDoldur();
        this.malzemeEkleButonuAyarla();
        this.eventListenerlariniEkle();
        await this.tarifleriYukle();
    }

    async tarifleriYukle() {
        this.tariflerRef.on('value', (snapshot) => {
            this.tarifler = [];
            snapshot.forEach((childSnapshot) => {
                const tarif = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                };
                this.tarifler.push(tarif);
            });
            this.tarifleriGoster();
        });
    }

    async tarifKaydet(tarifData, resimDosyasi) {
        try {
            let resimUrl = '';
            if (resimDosyasi) {
                const resimRef = storageRef(storage, `tarif-resimleri/${Date.now()}_${resimDosyasi.name}`);
                await uploadBytes(resimRef, resimDosyasi);
                resimUrl = await getDownloadURL(resimRef);
            }

            const yeniTarif = {
                ...tarifData,
                resimUrl,
                olusturulmaTarihi: Date.now()
            };

            const yeniTarifRef = push(this.tariflerRef);
            await set(yeniTarifRef, yeniTarif);
            return true;
        } catch (error) {
            console.error('Tarif kaydedilirken hata:', error);
            return false;
        }
    }

    kategorileriDoldur() {
        const kategoriler = Object.values(KATEGORILER);
        const kategoriSelect = document.getElementById('tarif-kategori');
        const kategoriFiltre = document.getElementById('kategori-filtre');

        kategoriler.forEach(kategori => {
            // Yeni tarif formundaki kategori seçenekleri
            const option1 = document.createElement('option');
            option1.value = kategori;
            option1.textContent = kategori;
            kategoriSelect.appendChild(option1);

            // Filtreleme için kategori seçenekleri
            const option2 = document.createElement('option');
            option2.value = kategori;
            option2.textContent = kategori;
            kategoriFiltre.appendChild(option2);
        });
    }

    malzemeEkleButonuAyarla() {
        const malzemeEkleBtn = document.getElementById('malzeme-ekle');
        const malzemelerListesi = document.getElementById('malzemeler-listesi');

        malzemeEkleBtn.addEventListener('click', () => {
            const yeniMalzeme = document.createElement('div');
            yeniMalzeme.className = 'malzeme-girisi';
            yeniMalzeme.innerHTML = `
                <input type="text" placeholder="Malzeme" required>
                <input type="text" placeholder="Miktar" required>
                <button type="button" class="malzeme-sil">Sil</button>
            `;
            malzemelerListesi.appendChild(yeniMalzeme);

            // Silme butonu için event listener
            yeniMalzeme.querySelector('.malzeme-sil').addEventListener('click', () => {
                yeniMalzeme.remove();
            });
        });

        // İlk malzeme girişi için silme butonu
        const ilkMalzemeSil = document.querySelector('.malzeme-sil');
        if (ilkMalzemeSil) {
            ilkMalzemeSil.addEventListener('click', (e) => {
                if (document.querySelectorAll('.malzeme-girisi').length > 1) {
                    e.target.closest('.malzeme-girisi').remove();
                }
            });
        }
    }

    eventListenerlariniEkle() {
        // Modal işlemleri
        const modal = document.getElementById('tarif-modal');
        const yeniTarifBtn = document.getElementById('yeni-tarif-ekle');
        const kapatBtn = document.querySelector('.close');
        const menuToggle = document.getElementById('menu-toggle');
        const nav = document.getElementById('main-nav');

        yeniTarifBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        kapatBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });

        // Modal dışına tıklandığında kapatma
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Form gönderimi
        const form = document.getElementById('yeni-tarif-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const tarifData = {
                isim: document.getElementById('tarif-isim').value,
                kategori: document.getElementById('tarif-kategori').value,
                zorluk: document.getElementById('tarif-zorluk').value,
                hazirlamaSuresi: parseInt(document.getElementById('tarif-sure').value),
                malzemeler: this.malzemeleriTopla(),
                talimatlar: document.getElementById('tarif-talimatlar').value,
                puan: 0,
                denenmis: false
            };

            const resimDosyasi = document.getElementById('tarif-resim').files[0];

            try {
                if (await this.tarifKaydet(tarifData, resimDosyasi)) {
                    modal.style.display = 'none';
                    form.reset();
                    alert('Tarif başarıyla kaydedildi!');
                }
            } catch (error) {
                console.error('Tarif kaydedilirken hata:', error);
                alert('Tarif kaydedilirken bir hata oluştu!');
            }
        });

        // Filtreleme işlemleri
        const kategoriFiltre = document.getElementById('kategori-filtre');
        const zorlukFiltre = document.getElementById('zorluk-filtre');
        const minPuanFiltre = document.getElementById('min-puan');
        const denenmisFiltre = document.getElementById('denenmis-filtre');

        const filtrelemeYap = () => {
            const filtrelenmisler = this.tarifleriFiltrele(
                kategoriFiltre.value,
                zorlukFiltre.value,
                minPuanFiltre.value ? parseFloat(minPuanFiltre.value) : null,
                denenmisFiltre.checked
            );
            this.tarifleriGoster(filtrelenmisler);
        };

        kategoriFiltre.addEventListener('change', filtrelemeYap);
        zorlukFiltre.addEventListener('change', filtrelemeYap);
        minPuanFiltre.addEventListener('input', filtrelemeYap);
        denenmisFiltre.addEventListener('change', filtrelemeYap);
    }

    malzemeleriTopla() {
        const malzemeler = [];
        document.querySelectorAll('.malzeme-girisi').forEach(giris => {
            const malzeme = giris.querySelector('input[placeholder="Malzeme"]').value;
            const miktar = giris.querySelector('input[placeholder="Miktar"]').value;
            if (malzeme && miktar) {
                malzemeler.push({ malzeme, miktar });
            }
        });
        return malzemeler;
    }

    tarifleriGoster(tarifler = this.tarifler) {
        const container = document.getElementById('tarif-listesi');
        if (!container) return;

        container.innerHTML = tarifler.length > 0 
            ? tarifler.map(tarif => this.tarifKartiOlustur(tarif)).join('')
            : '<p class="bos-mesaj">Henüz tarif eklenmemiş.</p>';
    }

    tarifKartiOlustur(tarif) {
        return `
            <div class="tarif-card">
                ${tarif.resimUrl ? `<img src="${tarif.resimUrl}" alt="${tarif.isim}" class="tarif-image">` : ''}
                <div class="tarif-info">
                    <h3>${tarif.isim}</h3>
                    <p>${tarif.kategori} • ${tarif.zorluk} • ${tarif.hazirlamaSuresi} dk</p>
                </div>
                <div class="tarif-actions">
                    <button onclick="uygulama.tarifDetayGoster('${tarif.id}')">Detaylar</button>
                    <button onclick="uygulama.menueyeEkle('${tarif.id}')">Menüye Ekle</button>
                </div>
            </div>
        `;
    }

    tarifEkle(tarif) {
        this.tarifler.push(tarif);
    }

    tarifleriFiltrele(kategori = null, zorluk = null, minPuan = null, sadeceDenemis = false) {
        return this.tarifler.filter(tarif => {
            let kosullar = true;
            if (kategori) kosullar = kosullar && tarif.kategori === kategori;
            if (zorluk) kosullar = kosullar && tarif.zorluk === zorluk;
            if (minPuan) kosullar = kosullar && tarif.puan >= minPuan;
            if (sadeceDenemis) kosullar = kosullar && tarif.denenmis;
            return kosullar;
        });
    }

    haftalikPlanGuncelle(gun, ogun, tarifId) {
        const planRef = db.ref(`haftalikPlanlar/${gun}/${ogun}`);
        return planRef.set(tarifId);
    }

    haftalikPlanDinle() {
        db.ref('haftalikPlanlar').on('value', (snapshot) => {
            this.haftalikPlan = snapshot.val() || this.haftalikPlan;
            this.haftalikPlanGoster();
        });
    }

    async tarifSil(tarifId) {
        try {
            await this.tariflerRef.child(tarifId).remove();
            return true;
        } catch (error) {
            console.error('Tarif silinirken hata:', error);
            return false;
        }
    }

    async tarifGuncelle(tarifId, guncelTarifData) {
        try {
            await this.tariflerRef.child(tarifId).update(guncelTarifData);
            return true;
        } catch (error) {
            console.error('Tarif güncellenirken hata:', error);
            return false;
        }
    }
}

// Uygulamayı başlat
const uygulama = new YemekPlanlamaUygulamasi();

// Örnek tarif ekleme
const menemen = new Tarif(
    1,
    'Menemen',
    KATEGORILER.KAHVALTI,
    'Kolay',
    20,
    4.8,
    true
);

uygulama.tarifEkle(menemen);

// Event listener'ları ve DOM manipülasyonu burada eklenecek
document.addEventListener('DOMContentLoaded', () => {
    // DOM elementlerini seç ve event listener'ları ekle
});
