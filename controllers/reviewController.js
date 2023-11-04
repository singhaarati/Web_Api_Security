const Destination = require('../models/Destination');

// Get all reviews

const getAllReviews = (req, res, next) => {
    Destination.findById(req.params.Destination_id)
        .then((destination) => {
            if (!destination) return res.status(404).json({ error: 'destination not found' })
            res.json(destination.reviews)
        }).catch(next)
}

// Create a new review object

const createReview = (req, res, next) => {
    Destination.findById(req.params.Destination_id)
        .then((destination) => {
            if (!destination) return res.status(404).json({ error: 'Destination not found' })
            const review = {
                text: req.body.text,
                user: req.user.id
            }
            destination.reviews.push(review)
            destination.save()
                .then((destination) => res
                    .status(201)
                    .json(destination.reviews[destination.reviews.length - 1]))
                .catch(next)
        }).catch(next)
}

//delete all reviews

const deleteAllReviews = (req, res, next) => {
    Destination.findById(req.params.Destination_id)
        .then((destination) => {
            if (!destination) return res.status(404).json({ error: 'destination not found' })
            destination.reviews = []
            destination.save()
                .then((destination) => res.status(204).end())
                .catch(next)
        }).catch(next)
}



// Export the controller functions
module.exports = {
    createReview,
    getAllReviews,
    deleteAllReviews,
    getReviewById,
    updateReviewById,
    deleteReviewById,
};