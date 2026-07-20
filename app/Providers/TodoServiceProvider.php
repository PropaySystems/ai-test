<?php

namespace App\Providers;

use App\Repositories\Contracts\TodoRepositoryInterface;
use App\Repositories\TodoRepository;
use Illuminate\Support\ServiceProvider;

class TodoServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(TodoRepositoryInterface::class, TodoRepository::class);
    }
}
