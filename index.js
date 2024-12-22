const express = require('express');
const fs = require('fs');
const path = require('path');
const redis = require('redis');
const app = express();

// Config
require('dotenv').config();
const PORT = process.env.NODE_ENV === 'production' ? 3051 : 3050;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const DATA_PATH = path.join(__dirname, 'data');
const COASTERS_FILE = path.join(DATA_PATH, 'coasters.json');

// Middleware
app.use(express.json());

// Redis Client
const redisClient = redis.createClient({ host: REDIS_HOST, port: REDIS_PORT });
redisClient.on('error', (err) => console.error('Redis error:', err));

// Helper methods
const loadData = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Endpoints
app.post('/api/coasters', (req, res) => {
    const {
        liczba_personelu,
        liczba_klientow,
        dl_trasy,
        godziny_od,
        godziny_do
    } = req.body;

    if (
        !liczba_personelu ||
        !liczba_klientow ||
        !dl_trasy ||
        !godziny_od ||
        !godziny_do
    ) {
        return res.status(400).json({ error: 'Wszystkie pola są wymagane.' });
    }

    const coasters = loadData(COASTERS_FILE);
    const newCoaster = {
        id: `coaster_${Date.now()}`,
        liczba_personelu,
        liczba_klientow,
        dl_trasy,
        godziny_od,
        godziny_do,
        wagons: []
    };

    coasters.push(newCoaster);
    saveData(COASTERS_FILE, coasters);

    res.status(201).json(newCoaster);
});

app.post('/api/coasters/:coasterId/wagons', (req, res) => {
    const { coasterId } = req.params;
    const { ilosc_miejsc, predkosc_wagonu } = req.body;

    if (!ilosc_miejsc || !predkosc_wagonu) {
        return res.status(400).json({ error: 'Wszystkie pola są wymagane.' });
    }

    const coasters = loadData(COASTERS_FILE);
    const coaster = coasters.find((c) => c.id === coasterId);

    if (!coaster) {
        return res
            .status(404)
            .json({ error: 'Kolejka górska nie została znaleziona.' });
    }

    const newWagon = {
        id: `wagon_${Date.now()}`,
        ilosc_miejsc,
        predkosc_wagonu
    };

    coaster.wagons.push(newWagon);
    saveData(COASTERS_FILE, coasters);

    res.status(201).json(newWagon);
});

app.delete('/api/coasters/:coasterId/wagons/:wagonId', (req, res) => {
    const { coasterId, wagonId } = req.params;

    const coasters = loadData(COASTERS_FILE);
    const coaster = coasters.find((c) => c.id === coasterId);

    if (!coaster) {
        return res
            .status(404)
            .json({ error: 'Kolejka górska nie została znaleziona.' });
    }

    const wagonIndex = coaster.wagons.findIndex((w) => w.id === wagonId);
    if (wagonIndex === -1) {
        return res.status(404).json({ error: 'Wagon nie został znaleziony.' });
    }

    coaster.wagons.splice(wagonIndex, 1);
    saveData(COASTERS_FILE, coasters);

    res.status(204).send();
});

app.put('/api/coasters/:coasterId', (req, res) => {
    const { coasterId } = req.params;
    const { liczba_personelu, liczba_klientow, godziny_od, godziny_do } =
        req.body;

    const coasters = loadData(COASTERS_FILE);
    const coaster = coasters.find((c) => c.id === coasterId);

    if (!coaster) {
        return res
            .status(404)
            .json({ error: 'Kolejka górska nie została znaleziona.' });
    }

    coaster.liczba_personelu = liczba_personelu || coaster.liczba_personelu;
    coaster.liczba_klientow = liczba_klientow || coaster.liczba_klientow;
    coaster.godziny_od = godziny_od || coaster.godziny_od;
    coaster.godziny_do = godziny_do || coaster.godziny_do;

    saveData(COASTERS_FILE, coasters);

    res.status(200).json(coaster);
});

app.listen(PORT, () => {
    console.log(
        `API działa na porcie ${PORT} w trybie ${
            process.env.NODE_ENV || 'development'
        }`
    );
});
