// Firebase metodlarını import et
import { ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";

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
        await this.tarifleriYukle();
        this.eventListenerlariniEkle();
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

    eventListenerlariniEkle() {
        // Modal açma/kapama
        const modal = document.getElementById('tarif-modal');
        const yeniTarifBtn = document.getElementById('yeni-tarif-ekle');
        const kapatBtn = document.querySelector('.close');
        const menuToggle = document.getElementById('menu-toggle');
        const nav = document.getElementById('main-nav');

        yeniTarifBtn.onclick = () => modal.style.display = 'block';
        kapatBtn.onclick = () => modal.style.display = 'none';
        menuToggle.onclick = () => nav.classList.toggle('active');

        // Form gönderimi
        document.getElementById('yeni-tarif-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const tarifData = {
                isim: formData.get('tarif-isim'),
                kategori: formData.get('tarif-kategori'),
                zorluk: formData.get('tarif-zorluk'),
                hazirlamaSuresi: parseInt(formData.get('tarif-sure')),
                malzemeler: this.malzemeleriTopla(),
                talimatlar: formData.get('tarif-talimatlar')
            };

            const resimDosyasi = formData.get('tarif-resim');
            if (await this.tarifKaydet(tarifData, resimDosyasi)) {
                modal.style.display = 'none';
                e.target.reset();
            }
        };
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

    tarifleriGoster() {
        const container = document.getElementById('tarif-listesi');
        container.innerHTML = this.tarifler.map(tarif => this.tarifKartiOlustur(tarif)).join('');
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

// Örnek kullanım
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
