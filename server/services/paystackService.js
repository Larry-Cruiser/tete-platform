const axios = require('axios');

class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
        this.baseURL = 'https://api.paystack.co';
        this.headers = {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
        };
    }

    async initializeTransaction(data) {
        try {
            const response = await axios.post(
                `${this.baseURL}/transaction/initialize`,
                data,
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Paystack initialize error:', error.response?.data);
            return { status: false, message: error.message };
        }
    }

    async verifyTransaction(reference) {
        try {
            const response = await axios.get(
                `${this.baseURL}/transaction/verify/${reference}`,
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Paystack verify error:', error.response?.data);
            return { status: false, message: error.message };
        }
    }

    async createRecipient(data) {
        try {
            const response = await axios.post(
                `${this.baseURL}/transferrecipient`,
                {
                    type: 'nuban',
                    name: data.name,
                    account_number: data.account_number,
                    bank_code: data.bank_code,
                    currency: 'NGN'
                },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Paystack recipient error:', error.response?.data);
            return { status: false, message: error.message };
        }
    }

    async initiateTransfer(data) {
        try {
            const response = await axios.post(
                `${this.baseURL}/transfer`,
                {
                    source: 'balance',
                    amount: data.amount,
                    recipient: data.recipient,
                    reason: data.reason,
                    reference: data.reference
                },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Paystack transfer error:', error.response?.data);
            return { status: false, message: error.message };
        }
    }

    async getBanks() {
        try {
            const response = await axios.get(
                `${this.baseURL}/bank?country=nigeria`,
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Paystack banks error:', error.response?.data);
            return { status: false, message: error.message };
        }
    }
}

module.exports = new PaystackService();