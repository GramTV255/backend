'use strict';

const express = require('express');

const {
    authenticate
} = require('../middleware/auth');

const dataService = require('../services/data.service');

const router = express.Router();

/**
 * GET /api/data
 * Mtu yeyote anaweza kusoma data za umma.
 */
router.get('/', async (req, res, next) => {
    try {
        const data = await dataService.getPublicData({
            limit: req.query.limit,
            offset: req.query.offset
        });

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * GET /api/data/mine
 * Mtumiaji aliyeingia anaweza kusoma data zake.
 */
router.get('/mine', authenticate, async (req, res, next) => {
    try {
        const data = await dataService.getMyData(
            req.auth.userId,
            {
                limit: req.query.limit,
                offset: req.query.offset
            }
        );

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * POST /api/data
 * Ongeza data mpya.
 */
router.post('/', authenticate, async (req, res, next) => {
    try {
        const data = await dataService.createData(
            req.auth.userId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: 'Data imeongezwa.',
            data
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * PATCH /api/data/:id
 * Mmiliki pekee ndiye anayeweza kuhariri data.
 */
router.patch('/:id', authenticate, async (req, res, next) => {
    try {
        const data = await dataService.updateMyData(
            req.auth.userId,
            req.params.id,
            req.body
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Data haipo au huna ruhusa ya kuibadilisha.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Data imebadilishwa.',
            data
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * DELETE /api/data/:id
 * Mmiliki pekee ndiye anayeweza kufuta data.
 */
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const deleted = await dataService.deleteMyData(
            req.auth.userId,
            req.params.id
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Data haipo au huna ruhusa ya kuifuta.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Data imefutwa.'
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
